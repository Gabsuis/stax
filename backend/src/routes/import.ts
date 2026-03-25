import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { routeDocument, extractLobbySign, createVacancyRunner, type LobbySignResult } from '../agents/document-agent';
import { stringifyContent } from '@google/adk';
import { supabase } from '../lib/supabase';
import { saveExtractionToDatabase } from '../lib/supabase-import';
import { extractionResultSchema } from '../agents/schemas';
import type { ExtractionResult } from '../agents/schemas';
import { findDuplicates } from '../lib/duplicate-check';

const app = new Hono();

// POST /import/process
app.post('/process', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  // Anti-buffering headers for Railway/proxies
  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache, no-transform');

  return streamSSE(c, async (stream) => {
    const send = async (event: string, data: unknown) => {
      await stream.writeSSE({ event, data: JSON.stringify(data) });
    };

    // Keep-alive ping
    const keepAlive = setInterval(async () => {
      try { await stream.writeSSE({ event: 'ping', data: '' }); } catch { /* closed */ }
    }, 10000);

    try {
      await send('progress', { stage: 'uploading', message: 'Received file...', step: 1, total: 3 });

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      // Check for duplicate document
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('id, file_name, ai_status, created_at')
        .eq('file_name', file.name)
        .eq('file_size_bytes', file.size)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingDocs?.length) {
        await send('warning', {
          message: `Already uploaded on ${new Date(existingDocs[0].created_at).toLocaleDateString()} (${existingDocs[0].ai_status})`,
        });
      }

      // Upload to storage
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `imports/${Date.now()}_${safeName}`;
      await supabase.storage.from('documents').upload(storagePath, buffer, { contentType: file.type });

      // Create document record
      const { data: docRow } = await supabase
        .from('documents')
        .insert({ file_name: file.name, file_type: file.type, file_size_bytes: file.size, storage_path: storagePath, ai_status: 'processing' })
        .select('id')
        .single();

      if (!docRow) {
        await send('error', { message: 'Failed to create document record' });
        return;
      }

      // ── STEP 1: Route ──
      await send('progress', { stage: 'routing', message: 'Identifying document type...', step: 1, total: 3 });
      const docType = await routeDocument(base64, file.type);
      console.log(`[ROUTER] ${file.name} → ${docType}`);

      if (docType === 'lobby_sign') {
        // ── STEP 2: Extract lobby sign ──
        await send('progress', { stage: 'extracting', message: 'Reading lobby sign...', step: 2, total: 3 });
        const result = await extractLobbySign(base64, file.type);
        console.log(`[EXTRACT] ${result.building_name} — ${result.floor_count} floors`);

        // ── STEP 3: Check duplicates + return for preview ──
        await send('progress', { stage: 'checking', message: 'Checking for duplicates...', step: 3, total: 3 });

        // Convert to our standard extraction format for the frontend
        const extraction = lobbySignToExtraction(result);

        const duplicates = await findDuplicates(extraction.buildings);

        // Save agent output to document
        await supabase.from('documents').update({
          ai_raw_output: { type: 'lobby_sign', result },
          ai_model: 'gemini-3.1-flash-preview',
          document_type: 'floor_plan',
        }).eq('id', docRow.id);

        if (duplicates.length > 0) {
          await send('result', {
            ...extraction,
            _document_id: docRow.id,
            _duplicates: duplicates,
            _auto_saved: false,
            _lobby_sign: result,
          });
        } else {
          // Auto-save
          await saveExtractionToDatabase(extraction, docRow.id);
          await send('result', {
            ...extraction,
            _document_id: docRow.id,
            _duplicates: [],
            _auto_saved: true,
            _lobby_sign: result,
          });
        }

        await send('done', {});

      } else if (docType === 'vacancy_listing') {
        // ── ADK 2-agent pipeline ──
        await send('progress', { stage: 'extracting', message: 'Reading document...', step: 2, total: 5 });

        const runner = createVacancyRunner();
        const session = await runner.sessionService.createSession({ appName: 'stax-import', userId: 'import-user' });

        const agentOutputs: Record<string, string> = {};
        let lastAuthor = '';

        for await (const event of runner.runAsync({
          userId: 'import-user',
          sessionId: session.id,
          newMessage: {
            role: 'user',
            parts: [
              { text: 'Extract all building and floor data from this vacancy listing.' },
              { inlineData: { data: base64, mimeType: file.type } },
            ],
          },
        })) {
          const author = event.author ?? '';
          const eventText = stringifyContent(event);
          if (author && author !== 'user' && eventText && eventText.length < 50000) {
            agentOutputs[author] = eventText;
            console.log(`[AGENT:${author}] (${eventText.length} chars): ${eventText.slice(0, 300)}${eventText.length > 300 ? '...' : ''}`);
          }
          if (author && author !== lastAuthor) {
            lastAuthor = author;
            if (author === 'parser') await send('progress', { stage: 'extracting', message: 'Reading document...', step: 2, total: 5 });
            if (author === 'buildings_counter') await send('progress', { stage: 'extracting', message: 'Identifying buildings...', step: 3, total: 5 });
            if (author === 'floors_extractor') await send('progress', { stage: 'extracting', message: 'Extracting floors...', step: 4, total: 5 });
          }
        }

        // Read from session state
        const updatedSession = await runner.sessionService.getSession({ appName: 'stax-import', userId: 'import-user', sessionId: session.id });
        const buildingsRaw = updatedSession?.state['buildings_data'] || agentOutputs['buildings_counter'];
        const floorsRaw = updatedSession?.state['floors_data'] || agentOutputs['floors_extractor'];

        // Server-side merge
        let buildingsParsed: { buildings: Record<string, unknown>[] } = { buildings: [] };
        let floorsParsed: { buildings: Record<string, unknown>[] } = { buildings: [] };
        try { buildingsParsed = JSON.parse(String(buildingsRaw).replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim()); } catch {}
        try { floorsParsed = JSON.parse(String(floorsRaw).replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim()); } catch {}

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

        const extraction = {
          document_type: 'vacancy_listing',
          language: 'he',
          buildings: mergedBuildings,
        } as ExtractionResult;

        await send('progress', { stage: 'checking', message: 'Checking duplicates...', step: 5, total: 5 });
        const duplicates = await findDuplicates(extraction.buildings);

        await supabase.from('documents').update({
          ai_raw_output: { type: 'vacancy_listing', buildings: agentOutputs['buildings_counter'], floors: agentOutputs['floors_extractor'] },
          ai_model: 'gemini-3.1-flash-preview',
          document_type: 'vacancy_listing',
        }).eq('id', docRow.id);

        if (duplicates.length > 0) {
          await send('result', { ...extraction, _document_id: docRow.id, _duplicates: duplicates, _auto_saved: false });
        } else {
          await saveExtractionToDatabase(extraction, docRow.id);
          await send('result', { ...extraction, _document_id: docRow.id, _duplicates: [], _auto_saved: true });
        }

        await send('done', {});

      } else {
        await send('error', { message: 'Unrecognized document type. Please upload a photo of a building lobby directory sign.' });
      }

    } catch (err) {
      console.error('[IMPORT ERROR]', err);
      await send('error', { message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      clearInterval(keepAlive);
    }
  });
});

// Convert lobby sign result to our standard ExtractionResult format
function lobbySignToExtraction(sign: LobbySignResult): ExtractionResult {
  return {
    document_type: 'floor_plan',
    language: sign.building_name ? 'he' : 'en',
    buildings: [{
      name: sign.building_name || sign.building_name_en || 'Unknown Building',
      name_en: sign.building_name_en,
      address: sign.address || undefined,
      city: sign.city || undefined,
      city_en: sign.city_en || undefined,
      class: undefined,
      floor_count: sign.floor_count || undefined,
      floors: sign.floors.map((f) => ({
        floor_number: parseInt(f.floor_number) || 0,
        total_sqm: 0,
        blocks: f.tenants.map((tenant) => ({
          tenant_name: f.has_vacancy && tenant.includes('להשכרה') ? undefined : tenant,
          sqm: 0,
          status: (f.has_vacancy && tenant.includes('להשכרה') ? 'vacant' : 'occupied') as 'vacant' | 'occupied',
        })),
      })),
      _confidence: 0.9,
    }],
  };
}

// POST /import/save — save with broker decisions
app.post('/save', async (c) => {
  try {
    const body = await c.req.json<{
      document_id: string;
      extraction: ExtractionResult;
      decisions: { extracted_index: number; action: string; existing_id?: string }[];
    }>();

    const { document_id, extraction, decisions } = body;
    if (!document_id || !extraction || !decisions) {
      return c.json({ error: 'Missing fields' }, 400);
    }

    const { saveExtractionToDatabase, replaceBuildingWithExtraction, mergeBuildingWithExtraction } = await import('../lib/supabase-import');

    const results = { inserted: [] as string[], replaced: [] as string[], merged: [] as string[], skipped: [] as string[] };
    const toInsert: typeof extraction.buildings = [];

    for (let i = 0; i < extraction.buildings.length; i++) {
      const building = extraction.buildings[i];
      const decision = decisions.find((d) => d.extracted_index === i);

      if (!decision || decision.action === 'insert') {
        toInsert.push(building);
        results.inserted.push(building.name);
      } else if (decision.action === 'replace' && decision.existing_id) {
        await replaceBuildingWithExtraction(decision.existing_id, building, document_id);
        results.replaced.push(building.name);
      } else if (decision.action === 'merge' && decision.existing_id) {
        await mergeBuildingWithExtraction(decision.existing_id, building, document_id);
        results.merged.push(building.name);
      } else {
        results.skipped.push(building.name);
      }
    }

    if (toInsert.length > 0) {
      await saveExtractionToDatabase({ ...extraction, buildings: toInsert }, document_id);
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
