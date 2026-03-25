import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createRunner } from '../agents/document-agent';
import { extractionResultSchema } from '../agents/schemas';
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

  // Set headers to prevent proxy buffering (Railway, Cloudflare, nginx)
  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache, no-transform');

  return streamSSE(c, async (stream) => {
    const send = async (event: string, data: unknown) => {
      await stream.writeSSE({ event, data: JSON.stringify(data) });
    };

    // Keep-alive: send a comment every 10s to prevent proxy timeout
    const keepAlive = setInterval(async () => {
      try { await stream.writeSSE({ event: 'ping', data: '' }); } catch { /* stream closed */ }
    }, 10000);

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

        // Skip user messages, empty events, and garbage blobs
        if (author === 'user' || !eventText || eventText.length < 2) continue;
        if (eventText.length > 50000) {
          console.log(`[SKIP] massive blob from ${author} (${eventText.length} chars)`);
          continue;
        }

        agentLogs.push({
          agent: author,
          timestamp: new Date().toISOString(),
          text: eventText.slice(0, 5000),
        });
        agentOutputs[author] = eventText;
        console.log(`[AGENT:${author}] (${eventText.length} chars): ${eventText.slice(0, 300)}${eventText.length > 300 ? '...' : ''}`);

        if (author && author !== lastAuthor) {
          lastAuthor = author;
          const steps: Record<string, { step: number; total: number; message: string }> = {
            parser: { step: 1, total: 4, message: 'Reading document...' },
            classifier: { step: 2, total: 4, message: 'Identifying buildings...' },
            buildings_extractor: { step: 3, total: 4, message: 'Extracting building data...' },
            floors_extractor: { step: 4, total: 4, message: 'Extracting floors & units...' },
          };
          const stepInfo = steps[author];
          if (stepInfo) {
            console.log(`\n${'═'.repeat(60)}\n[STEP ${stepInfo.step}/${stepInfo.total}] ${author} starting...\n${'═'.repeat(60)}`);
            await send('progress', {
              stage: 'extracting',
              message: stepInfo.message,
              step: stepInfo.step,
              total: stepInfo.total,
            });
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

      // Debug: log what each agent stored
      console.log('\n' + '═'.repeat(60));
      console.log('[DEBUG] Pipeline complete. Agent outputs:');
      for (const [agent, output] of Object.entries(agentOutputs)) {
        const preview = typeof output === 'string' ? output.slice(0, 200) : JSON.stringify(output).slice(0, 200);
        console.log(`  ${agent}: ${preview}...`);
      }
      console.log('═'.repeat(60) + '\n');

      // Read results — try session state first, fallback to collected event outputs
      let classificationRaw: unknown;

      const updatedSession = await runner.sessionService.getSession({
        appName: 'stax-import',
        userId: 'import-user',
        sessionId: session.id,
      });

      if (updatedSession) {
        console.log('[DEBUG] Session state keys:', Object.keys(updatedSession.state));
        classificationRaw = updatedSession.state['classification'] || agentOutputs['classifier'];
      } else {
        console.warn('[WARN] Session state not found, using event outputs');
        classificationRaw = agentOutputs['classifier'];
      }

      // Get buildings and floors data (from state or event outputs)
      const buildingsRaw = updatedSession?.state['buildings_data'] || agentOutputs['buildings_extractor'];
      const floorsRaw = updatedSession?.state['floors_data'] || agentOutputs['floors_extractor'];

      // SERVER-SIDE MERGE: combine buildings + floors into final result
      // No AI needed — deterministic code merge
      let classificationParsed: Record<string, unknown> = {};
      try {
        const raw = typeof classificationRaw === 'string' ? classificationRaw : JSON.stringify(classificationRaw);
        classificationParsed = JSON.parse(raw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim());
      } catch { /* use defaults */ }

      let buildingsParsed: { buildings: Record<string, unknown>[] } = { buildings: [] };
      try {
        const raw = typeof buildingsRaw === 'string' ? buildingsRaw : JSON.stringify(buildingsRaw);
        buildingsParsed = JSON.parse(raw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim());
      } catch { /* empty */ }

      let floorsParsed: { buildings: Record<string, unknown>[] } = { buildings: [] };
      try {
        const raw = typeof floorsRaw === 'string' ? floorsRaw : JSON.stringify(floorsRaw);
        floorsParsed = JSON.parse(raw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim());
      } catch { /* empty */ }

      // Merge floors into buildings by name
      const floorsMap = new Map<string, unknown[]>();
      for (const fb of (floorsParsed.buildings || [])) {
        const name = fb.name as string;
        if (name) floorsMap.set(name.toLowerCase(), fb.floors as unknown[] || []);
      }

      const mergedBuildings = (buildingsParsed.buildings || []).map((b) => {
        const name = (b.name as string || '').toLowerCase();
        const floors = floorsMap.get(name) || [];
        return { ...b, floors };
      });

      // Build the final extraction result
      const extractionRaw = JSON.stringify({
        document_type: classificationParsed.document_type || 'other',
        language: (classificationParsed.language as string || 'he').toLowerCase(),
        buildings: mergedBuildings,
      });

      console.log(`[MERGE] ${mergedBuildings.length} buildings merged, sending to frontend`);

      if (mergedBuildings.length === 0) {
        await send('error', { message: 'No buildings extracted from the document.' });
        await supabase.from('documents').update({
          ai_status: 'failed',
          ai_raw_output: { classification: classificationRaw, agent_logs: agentLogs, agent_outputs: agentOutputs },
        }).eq('id', docRow.id);
        return;
      }

      // Parse the server-merged result
      const extractionParsed = JSON.parse(extractionRaw);
      const extractionValidation = extractionResultSchema.safeParse(extractionParsed);
      if (!extractionValidation.success) {
        // Lenient: accept if it has buildings array even if Zod fails
        if (Array.isArray(extractionParsed.buildings) && extractionParsed.buildings.length > 0) {
          console.warn('[WARN] Zod validation failed but buildings exist, proceeding');
        } else {
          await send('error', { message: `Validation failed: ${extractionValidation.error.message}` });
          await supabase.from('documents').update({
            ai_status: 'review_needed',
            ai_raw_output: extractionParsed,
          }).eq('id', docRow.id);
          return;
        }
      }

      // Use validated data if available, otherwise use raw parsed data
      let result = extractionValidation.success
        ? extractionValidation.data
        : extractionParsed as ExtractionResult;

      // Save all agent logs
      await supabase.from('documents').update({
        ai_raw_output: {
          classification: classificationRaw,
          buildings: agentOutputs['buildings_extractor'],
          floors: agentOutputs['floors_extractor'],
          merged: extractionRaw,
          agent_logs: agentLogs,
        },
        ai_model: 'gemini-3.1-flash-preview',
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
          _document_id: docRow.id,
          _duplicates: [],
          _auto_saved: true,
          _db: saveResult,
          _agent_logs: agentLogs,
        });
      }

      await send('done', {});
    } catch (err) {
      console.error('[IMPORT ERROR]', err);
      await send('error', { message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      clearInterval(keepAlive);
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
