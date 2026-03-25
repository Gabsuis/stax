import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createRunner } from '../agents/document-agent';
import { extractionResultSchema, validationResultSchema } from '../agents/schemas';
import type { ExtractionResult } from '../agents/schemas';
import { supabase } from '../lib/supabase';
import { saveExtractionToDatabase, replaceBuildingWithExtraction, mergeBuildingWithExtraction } from '../lib/supabase-import';
import { findDuplicates } from '../lib/duplicate-check';
import { stringifyContent, isFinalResponse } from '@google/adk';

const app = new Hono();

// POST /import/process — Upload + AI extraction + duplicate detection
app.post('/process', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  return streamSSE(c, async (stream) => {
    const send = async (event: string, data: unknown) => {
      await stream.writeSSE({ event, data: JSON.stringify(data) });
    };

    try {
      await send('progress', { stage: 'uploading', message: `Received ${file.name} (${(file.size / 1024).toFixed(0)} KB)` });

      // Check for duplicate document
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('id, file_name, ai_status, created_at')
        .eq('file_name', file.name)
        .eq('file_size_bytes', file.size)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingDocs && existingDocs.length > 0) {
        const existing = existingDocs[0];
        await send('warning', {
          message: `This document was already uploaded on ${new Date(existing.created_at).toLocaleDateString()} (status: ${existing.ai_status})`,
          existing_document_id: existing.id,
        });
      }

      // Upload to Supabase Storage
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `imports/${Date.now()}_${safeName}`;

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, { contentType: file.type });

      if (storageError) {
        await send('error', { message: `Storage upload failed: ${storageError.message}` });
        return;
      }

      // Create document record
      const { data: docRow, error: docError } = await supabase
        .from('documents')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
          storage_path: storagePath,
          ai_status: 'processing',
        })
        .select('id')
        .single();

      if (docError || !docRow) {
        await send('error', { message: `Document record failed: ${docError?.message}` });
        return;
      }

      await send('progress', { stage: 'analyzing', message: 'Step 1/3: Classifying document...' });

      // Run the 3-step sequential pipeline
      const runner = createRunner();
      const base64Data = buffer.toString('base64');

      const session = await runner.sessionService.createSession({
        appName: 'stax-import',
        userId: 'import-user',
      });

      let lastAuthor = '';
      const agentLogs: { agent: string; timestamp: string; text: string }[] = [];
      // Collect agent outputs directly from events as fallback
      const agentOutputs: Record<string, string> = {};

      for await (const event of runner.runAsync({
        userId: 'import-user',
        sessionId: session.id,
        newMessage: {
          role: 'user',
          parts: [
            { text: 'Process this commercial real estate document. Classify it, extract all building data, and validate the results.' },
            { inlineData: { data: base64Data, mimeType: file.type } },
          ],
        },
      })) {
        const author = event.author ?? '';
        const eventText = stringifyContent(event);

        if (author && author !== 'user' && eventText) {
          agentLogs.push({
            agent: author,
            timestamp: new Date().toISOString(),
            text: eventText.slice(0, 5000),
          });
          // Keep the LAST output per agent (the final response)
          agentOutputs[author] = eventText;
          console.log(`[AGENT:${author}] ${eventText.slice(0, 500)}`);
        }

        if (author && author !== lastAuthor) {
          lastAuthor = author;
          if (author === 'classifier') {
            await send('progress', { stage: 'analyzing', message: 'Step 1/3: Classifying document...' });
          } else if (author === 'extractor') {
            await send('progress', { stage: 'extracting', message: 'Step 2/3: Extracting building data (deep analysis)...' });
          } else if (author === 'validator') {
            await send('progress', { stage: 'validating', message: 'Step 3/3: Validating extraction...' });
          }
        }

        if (isFinalResponse(event) && author) {
          await send('log', {
            agent: author,
            text: eventText.slice(0, 500),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Read results — try session state first, fallback to collected event outputs
      let classificationRaw: unknown;
      let extractionRaw: unknown;
      let validationRaw: unknown;

      const updatedSession = await runner.sessionService.getSession({
        appName: 'stax-import',
        userId: 'import-user',
        sessionId: session.id,
      });

      if (updatedSession) {
        classificationRaw = updatedSession.state['classification'] || agentOutputs['classifier'];
        extractionRaw = updatedSession.state['extraction_result'] || agentOutputs['extractor'];
        validationRaw = updatedSession.state['validation_result'] || agentOutputs['validator'];
      } else {
        // Session not found — use event outputs directly
        console.warn('[WARN] Session state not found, using event outputs');
        classificationRaw = agentOutputs['classifier'];
        extractionRaw = agentOutputs['extractor'];
        validationRaw = agentOutputs['validator'];
      }

      if (!extractionRaw) {
        await send('error', { message: 'Pipeline completed but no extraction output received. Check agent logs.' });
        await supabase.from('documents').update({
          ai_status: 'failed',
          ai_raw_output: { classification: classificationRaw, agent_logs: agentLogs, agent_outputs: agentOutputs },
        }).eq('id', docRow.id);
        return;
      }

      // Parse extraction result
      let extractionParsed: unknown;
      try {
        const raw = typeof extractionRaw === 'string' ? extractionRaw : JSON.stringify(extractionRaw);
        const jsonStr = raw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
        extractionParsed = JSON.parse(jsonStr);
      } catch {
        await send('error', { message: 'Failed to parse extraction output as JSON' });
        await supabase.from('documents').update({
          ai_status: 'failed',
          ai_raw_output: { raw: extractionRaw, agent_logs: agentLogs },
        }).eq('id', docRow.id);
        return;
      }

      const extractionValidation = extractionResultSchema.safeParse(extractionParsed);
      if (!extractionValidation.success) {
        await send('error', { message: `Schema validation failed: ${extractionValidation.error.message}` });
        await supabase.from('documents').update({
          ai_status: 'review_needed',
          ai_raw_output: extractionParsed,
        }).eq('id', docRow.id);
        return;
      }

      let result = extractionValidation.data;

      // Check validator corrections — only apply if corrected version is richer, not stripped
      if (validationRaw) {
        try {
          const valRaw = typeof validationRaw === 'string' ? validationRaw : JSON.stringify(validationRaw);
          const valJson = JSON.parse(valRaw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim());
          const valParsed = validationResultSchema.safeParse(valJson);
          if (valParsed.success && valParsed.data.corrected_buildings?.length) {
            // Count non-null fields in original vs corrected
            const countFields = (obj: Record<string, unknown>) =>
              Object.values(obj).filter((v) => v !== null && v !== undefined && v !== '').length;

            const originalFieldCount = result.buildings.reduce((sum, b) => sum + countFields(b as unknown as Record<string, unknown>), 0);
            const correctedFieldCount = valParsed.data.corrected_buildings.reduce((sum, b) => sum + countFields(b as unknown as Record<string, unknown>), 0);

            if (correctedFieldCount >= originalFieldCount) {
              // Corrected version is at least as rich — use it
              result = { ...result, buildings: valParsed.data.corrected_buildings };
              await send('progress', { stage: 'corrected', message: `Validator corrected ${valParsed.data.issues?.length ?? 0} issue(s)` });
            } else {
              // Corrected version lost fields — keep original, just log the issues
              console.warn(`[WARN] Validator stripped fields (${correctedFieldCount} < ${originalFieldCount}), keeping original extraction`);
              if (valParsed.data.issues?.length) {
                await send('progress', { stage: 'validated', message: `${valParsed.data.issues.length} issue(s) noted but original extraction preserved` });
              }
            }
          }
        } catch { /* proceed with original */ }
      }

      // Save agent logs
      await supabase.from('documents').update({
        ai_raw_output: {
          classification: classificationRaw,
          extraction: extractionRaw,
          validation: validationRaw,
          agent_logs: agentLogs,
        },
        ai_model: 'gemini-3.1-pro-preview',
      }).eq('id', docRow.id);

      await send('progress', {
        stage: 'checking',
        message: `Found ${result.buildings.length} building(s). Checking for duplicates...`,
      });

      // Check for duplicates
      const duplicates = await findDuplicates(result.buildings);

      if (duplicates.length > 0) {
        await send('result', {
          ...result,
          _classification: classificationRaw,
          _validation: validationRaw,
          _document_id: docRow.id,
          _duplicates: duplicates,
          _auto_saved: false,
          _agent_logs: agentLogs,
        });
      } else {
        await send('progress', {
          stage: 'saving',
          message: `No duplicates found. Saving ${result.buildings.length} building(s)...`,
        });

        const saveResult = await saveExtractionToDatabase(result, docRow.id);

        await send('result', {
          ...result,
          _classification: classificationRaw,
          _validation: validationRaw,
          _document_id: docRow.id,
          _duplicates: [],
          _auto_saved: true,
          _db: saveResult,
          _agent_logs: agentLogs,
        });
      }

      await send('done', {});
    } catch (err) {
      await send('error', { message: err instanceof Error ? err.message : 'Unknown error' });
    }
  });
});

// POST /import/save — Phase 2: save with broker decisions
type SaveAction = 'insert' | 'replace' | 'merge' | 'skip';

app.post('/save', async (c) => {
  try {
    const body = await c.req.json<{
      document_id: string;
      extraction: ExtractionResult;
      decisions: { extracted_index: number; action: SaveAction; existing_id?: string }[];
    }>();

    const { document_id, extraction, decisions } = body;

    if (!document_id || !extraction || !decisions) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const decisionMap = new Map<number, { action: SaveAction; existing_id?: string }>();
    for (const d of decisions) {
      decisionMap.set(d.extracted_index, { action: d.action, existing_id: d.existing_id });
    }

    const results = {
      inserted: [] as string[],
      replaced: [] as string[],
      merged: [] as string[],
      skipped: [] as string[],
    };

    const buildingsToAutoInsert: typeof extraction.buildings = [];

    for (let i = 0; i < extraction.buildings.length; i++) {
      const building = extraction.buildings[i];
      const decision = decisionMap.get(i);

      if (!decision || decision.action === 'insert') {
        buildingsToAutoInsert.push(building);
        results.inserted.push(building.name);
      } else if (decision.action === 'replace' && decision.existing_id) {
        await replaceBuildingWithExtraction(decision.existing_id, building, document_id);
        results.replaced.push(building.name);
      } else if (decision.action === 'merge' && decision.existing_id) {
        await mergeBuildingWithExtraction(decision.existing_id, building, document_id);
        results.merged.push(building.name);
      } else if (decision.action === 'skip') {
        results.skipped.push(building.name);
      }
    }

    if (buildingsToAutoInsert.length > 0) {
      await saveExtractionToDatabase(
        { ...extraction, buildings: buildingsToAutoInsert },
        document_id
      );
    }

    await supabase.from('documents').update({
      ai_status: 'completed',
      ai_extracted_at: new Date().toISOString(),
    }).eq('id', document_id);

    return c.json({ success: true, results });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

export default app;
