/**
 * Seed script: inserts the 17 demo buildings from data/buildings.ts into Supabase.
 * Run with: npx tsx lib/seed.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { buildings } from '../data/buildings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Area values are already English enums (north/center/south) in mock data

// Map demo finish strings to delivery_condition enum
const FINISH_MAP: Record<string, string> = {
  'As-Is': 'as_is',
  'As-Is New': 'as_is_new',
  'As-Is High Level': 'as_is_high_level',
  'Shell & Core': 'shell_and_core',
  'As-Is / Shell & Core': 'shell_and_core',
  'בגמר': 'renovation_required',
};

async function seed() {
  console.log(`Seeding ${buildings.length} buildings into Supabase...`);

  for (const b of buildings) {
    console.log(`  → ${b.name} (${b.nameEn})`);

    // Insert building
    const { data: buildingRow, error: bErr } = await supabase
      .from('buildings')
      .insert({
        name: b.name,
        name_en: b.nameEn,
        address: b.address,
        city: 'הרצליה',
        city_en: 'Herzliya',
        area: b.area || null,
        class: b.class,
        floor_count: b.floorCount,
        typical_floor_sqm: b.floorSize,
        total_sqm: b.totalSqm,
        vacant_sqm: b.vacantSqm,
        occupancy_rate: b.occupancy,
        asking_rent_sqm: b.askingPrice || null,
        management_fee_sqm: b.managementFee || null,
        allowance: b.allowance || null,
        delivery_condition: FINISH_MAP[b.finish] || null,
        contact_name: b.contact !== '—' ? b.contact : null,
        contact_phone: b.phone !== '—' ? b.phone : null,
        notes: b.notes || null,
      })
      .select('id')
      .single();

    if (bErr || !buildingRow) {
      console.error(`    ✗ Building insert failed:`, bErr?.message);
      continue;
    }

    // Insert floors + blocks
    for (const floor of b.floors) {
      const { data: floorRow, error: fErr } = await supabase
        .from('floors')
        .insert({
          building_id: buildingRow.id,
          floor_number: floor.floor,
          total_sqm: floor.totalSqm,
        })
        .select('id')
        .single();

      if (fErr || !floorRow) {
        console.error(`    ✗ Floor ${floor.floor} failed:`, fErr?.message);
        continue;
      }

      for (const block of floor.blocks) {
        // Upsert tenant if occupied
        let tenantId: string | null = null;
        if (block.tenantName) {
          const { data: existing } = await supabase
            .from('tenants')
            .select('id')
            .eq('name', block.tenantName)
            .maybeSingle();

          if (existing) {
            tenantId = existing.id;
          } else {
            const { data: created } = await supabase
              .from('tenants')
              .insert({ name: block.tenantName })
              .select('id')
              .single();
            tenantId = created?.id ?? null;
          }
        }

        await supabase.from('tenant_blocks').insert({
          floor_id: floorRow.id,
          tenant_id: tenantId,
          sqm: block.sqm,
          status: block.status,
          lease_end: block.leaseEnd ? block.leaseEnd.toISOString().split('T')[0] : null,
          notes: block.notes || null,
        });
      }
    }

    console.log(`    ✓ Done`);
  }

  console.log(`\nSeeding complete! ${buildings.length} buildings inserted.`);
}

seed().catch(console.error);
