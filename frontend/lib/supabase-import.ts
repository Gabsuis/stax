import { supabase } from './supabase';
import type { ExtractionResult, BuildingExtraction } from './agents/schemas';

// Hebrew city → English name mapping
const CITY_EN_MAP: Record<string, string> = {
  'הרצליה': 'Herzliya',
  'תל אביב': 'Tel Aviv',
  'רמת גן': 'Ramat Gan',
  'בני ברק': 'Bnei Brak',
  'פתח תקווה': 'Petah Tikva',
  'נתניה': 'Netanya',
  'חולון': 'Holon',
  'חיפה': 'Haifa',
  'ירושלים': 'Jerusalem',
  'באר שבע': 'Beer Sheva',
  'רעננה': 'Raanana',
  'כפר סבא': 'Kfar Saba',
  'הוד השרון': 'Hod HaSharon',
  'רחובות': 'Rehovot',
  'ראשון לציון': 'Rishon LeZion',
  'אשדוד': 'Ashdod',
  'מודיעין': 'Modiin',
  'רמת החייל': 'Ramat HaHayal',
  'אזור': 'Azor',
  'אור יהודה': 'Or Yehuda',
  'יבנה': 'Yavne',
  'נוף הגליל': 'Nof HaGalil',
  'קריית אריה': 'Kiryat Arie',
};

/**
 * Recalculate building total_sqm, vacant_sqm, occupancy_rate from blocks.
 * Called after inserting floors/blocks when building-level data was missing.
 */
async function recalcBuildingStats(buildingId: string) {
  const { data: blocks } = await supabase
    .from('tenant_blocks')
    .select('sqm, status, floor_id')
    .in('floor_id', (
      await supabase.from('floors').select('id').eq('building_id', buildingId)
    ).data?.map((f) => f.id) ?? []);

  if (!blocks || blocks.length === 0) return;

  const totalFromBlocks = blocks.reduce((sum, b) => sum + (b.sqm || 0), 0);
  const vacantFromBlocks = blocks.filter((b) => b.status === 'vacant').reduce((sum, b) => sum + (b.sqm || 0), 0);

  // Get current building data
  const { data: building } = await supabase
    .from('buildings')
    .select('total_sqm, vacant_sqm, floor_count')
    .eq('id', buildingId)
    .single();

  if (!building) return;

  const updates: Record<string, unknown> = {};

  // Only update if current value is 0/missing and we have block data
  if (!building.total_sqm || building.total_sqm === 0) {
    updates.total_sqm = totalFromBlocks;
  }
  if (building.vacant_sqm === 0 && vacantFromBlocks > 0) {
    updates.vacant_sqm = vacantFromBlocks;
  }

  const totalSqm = (updates.total_sqm as number) || building.total_sqm || totalFromBlocks;
  const vacantSqm = (updates.vacant_sqm as number) ?? building.vacant_sqm ?? vacantFromBlocks;
  if (totalSqm > 0) {
    updates.occupancy_rate = (totalSqm - vacantSqm) / totalSqm;
  }

  // Count actual floors
  const { count: floorCount } = await supabase
    .from('floors')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', buildingId);

  if (floorCount && (!building.floor_count || building.floor_count === 0)) {
    updates.floor_count = floorCount;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('buildings').update(updates).eq('id', buildingId);
  }
}

function resolveCityEn(city?: string, cityEn?: string): string {
  if (cityEn && cityEn !== 'Herzliya') return cityEn;  // AI provided a real English name
  if (city && CITY_EN_MAP[city]) return CITY_EN_MAP[city];
  if (city) return city; // fallback: use Hebrew as-is
  return 'Herzliya';
}

interface SaveResult {
  document_id: string;
  building_ids: string[];
  floor_ids: string[];
  block_ids: string[];
  tenant_ids: string[];
}

export async function saveExtractionToDatabase(
  result: ExtractionResult,
  documentId: string
): Promise<SaveResult> {
  const buildingIds: string[] = [];
  const floorIds: string[] = [];
  const blockIds: string[] = [];
  const tenantIds: string[] = [];

  for (const building of result.buildings) {
    const buildingId = await saveBuilding(building);
    buildingIds.push(buildingId);

    // Link document to first building (multi-building docs link to first)
    if (buildingIds.length === 1) {
      await supabase
        .from('documents')
        .update({ building_id: buildingId, document_type: result.document_type })
        .eq('id', documentId);
    }

    // Amenities
    if (building.amenities?.length) {
      await supabase.from('building_amenities').insert(
        building.amenities.map((amenity) => ({
          building_id: buildingId,
          amenity,
        }))
      );
    }

    // Parking options
    if (building.parking_options?.length) {
      await supabase.from('parking_options').insert(
        building.parking_options.map((p) => ({
          building_id: buildingId,
          parking_type: p.parking_type,
          price_monthly: p.price_monthly,
          management_fee: p.management_fee,
          spaces_available: p.spaces_available,
          notes: p.notes,
        }))
      );
    }

    // Floors + blocks
    if (building.floors?.length) {
      for (const floor of building.floors) {
        const { data: floorRow } = await supabase
          .from('floors')
          .upsert(
            {
              building_id: buildingId,
              floor_number: floor.floor_number,
              total_sqm: floor.total_sqm ?? building.typical_floor_sqm ?? 0,
            },
            { onConflict: 'building_id,floor_number' }
          )
          .select('id')
          .single();

        if (!floorRow) continue;
        floorIds.push(floorRow.id);

        if (floor.blocks?.length) {
          for (const block of floor.blocks) {
            // Upsert tenant if name provided
            let tenantId: string | null = null;
            if (block.tenant_name) {
              tenantId = await upsertTenant(block.tenant_name, block.tenant_name_en);
              tenantIds.push(tenantId);
            }

            const { data: blockRow } = await supabase
              .from('tenant_blocks')
              .insert({
                floor_id: floorRow.id,
                tenant_id: tenantId,
                sqm: block.sqm ?? 0,
                status: block.status ?? (block.tenant_name ? 'occupied' : 'vacant'),
                is_sublease: block.is_sublease ?? false,
                sublease_tenant: block.sublease_tenant,
                sublease_end: block.sublease_end,
                available_from: block.available_from,
                delivery_condition: block.delivery_condition,
                lease_start: block.lease_start,
                lease_end: block.lease_end,
                rent_per_sqm: block.rent_per_sqm,
                management_fee_sqm: block.management_fee_sqm,
                escalation_pct: block.escalation_pct,
                escalation_index: block.escalation_index,
                option_periods: block.option_periods,
                option_years: block.option_years,
                notes: block.notes,
              })
              .select('id')
              .single();

            if (blockRow) blockIds.push(blockRow.id);
          }
        }
      }
    }

    // Recalculate building stats from blocks if missing
    await recalcBuildingStats(buildingId);
  }

  // Update document with completion status
  await supabase
    .from('documents')
    .update({
      ai_status: 'completed',
      ai_extracted_at: new Date().toISOString(),
      ai_raw_output: result,
      ai_confidence: result.buildings[0]?._confidence ?? null,
      ai_model: 'gemini-3.1-pro-preview',
    })
    .eq('id', documentId);

  // Audit trail
  await supabase.from('ai_extractions').insert({
    document_id: documentId,
    target_table: 'buildings',
    extracted_data: result,
    confidence: result.buildings[0]?._confidence ?? null,
    applied: true,
    applied_at: new Date().toISOString(),
    model: 'gemini-3.1-pro-preview',
    prompt_version: '1.0',
  });

  return { document_id: documentId, building_ids: buildingIds, floor_ids: floorIds, block_ids: blockIds, tenant_ids: [...new Set(tenantIds)] };
}

async function saveBuilding(b: BuildingExtraction): Promise<string> {
  // Upsert owner if provided
  let ownerId: string | null = null;
  if (b.owner?.name) {
    const { data: existing } = await supabase
      .from('owners')
      .select('id')
      .eq('name', b.owner.name)
      .maybeSingle();

    if (existing) {
      ownerId = existing.id;
    } else {
      const { data: created } = await supabase
        .from('owners')
        .insert({ name: b.owner.name, name_en: b.owner.name_en })
        .select('id')
        .single();
      ownerId = created?.id ?? null;
    }
  }

  const { data: buildingRow } = await supabase
    .from('buildings')
    .insert({
      name: b.name,
      name_en: b.name_en,
      owner_id: ownerId,
      address: b.address ?? '',
      city: b.city ?? 'הרצליה',
      city_en: resolveCityEn(b.city, b.city_en),
      area: b.area,
      class: b.class ?? 'A',
      year_built: b.year_built,
      leed_rating: b.leed_rating,
      floor_count: b.floor_count ?? b.floors?.length ?? 1,
      typical_floor_sqm: b.typical_floor_sqm ?? 0,
      total_sqm: b.total_sqm ?? 0,
      vacant_sqm: b.vacant_sqm ?? 0,
      occupancy_rate: b.occupancy_rate,
      asking_rent_sqm: b.asking_rent_sqm,
      delivery_condition: b.delivery_condition,
      allowance: b.allowance,
      management_fee_sqm: b.management_fee_sqm,
      municipal_tax_sqm: b.municipal_tax_sqm,
      distance_train_km: b.distance_train_km,
      distance_light_rail_km: b.distance_light_rail_km,
      parking_spaces: b.parking_spaces,
      parking_ratio: b.parking_ratio,
      contact_name: b.contact_name,
      contact_phone: b.contact_phone,
      contact_email: b.contact_email,
      notes: b.notes,
    })
    .select('id')
    .single();

  return buildingRow!.id;
}

async function upsertTenant(name: string, nameEn?: string): Promise<string> {
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from('tenants')
    .insert({ name, name_en: nameEn })
    .select('id')
    .single();

  return created!.id;
}

/**
 * Replace: delete old building + all children, then insert new data.
 */
export async function replaceBuildingWithExtraction(
  existingId: string,
  building: BuildingExtraction,
  documentId: string
) {
  // Delete cascades: floors → tenant_blocks are CASCADE
  await supabase.from('building_amenities').delete().eq('building_id', existingId);
  await supabase.from('parking_options').delete().eq('building_id', existingId);
  await supabase.from('floors').delete().eq('building_id', existingId);
  await supabase.from('buildings').delete().eq('id', existingId);

  // Insert fresh
  const result: ExtractionResult = {
    document_type: 'other',
    language: 'he',
    buildings: [building],
  };
  await saveExtractionToDatabase(result, documentId);
}

/**
 * Merge: update existing building with non-null fields from extraction.
 * Add new floors/blocks that don't exist yet.
 */
export async function mergeBuildingWithExtraction(
  existingId: string,
  building: BuildingExtraction,
  documentId: string
) {
  // Build update object with only non-null fields
  const updates: Record<string, unknown> = {};
  if (building.name_en) updates.name_en = building.name_en;
  if (building.address) updates.address = building.address;
  if (building.city) updates.city = building.city;
  if (building.city || building.city_en) updates.city_en = resolveCityEn(building.city, building.city_en);
  if (building.area) updates.area = building.area;
  if (building.class) updates.class = building.class;
  if (building.year_built) updates.year_built = building.year_built;
  if (building.leed_rating) updates.leed_rating = building.leed_rating;
  if (building.total_sqm) updates.total_sqm = building.total_sqm;
  if (building.vacant_sqm !== undefined) updates.vacant_sqm = building.vacant_sqm;
  if (building.occupancy_rate) updates.occupancy_rate = building.occupancy_rate;
  if (building.asking_rent_sqm) updates.asking_rent_sqm = building.asking_rent_sqm;
  if (building.delivery_condition) updates.delivery_condition = building.delivery_condition;
  if (building.management_fee_sqm) updates.management_fee_sqm = building.management_fee_sqm;
  if (building.municipal_tax_sqm) updates.municipal_tax_sqm = building.municipal_tax_sqm;
  if (building.contact_name) updates.contact_name = building.contact_name;
  if (building.contact_phone) updates.contact_phone = building.contact_phone;
  if (building.contact_email) updates.contact_email = building.contact_email;
  if (building.notes) updates.notes = building.notes;
  updates.source_document_id = documentId;

  if (Object.keys(updates).length > 0) {
    await supabase.from('buildings').update(updates).eq('id', existingId);
  }

  // Add new amenities
  if (building.amenities?.length) {
    for (const amenity of building.amenities) {
      await supabase.from('building_amenities').upsert(
        { building_id: existingId, amenity },
        { onConflict: 'building_id,amenity' }
      );
    }
  }

  // Add new floors + blocks (upsert by floor number)
  if (building.floors?.length) {
    for (const floor of building.floors) {
      const { data: floorRow } = await supabase
        .from('floors')
        .upsert(
          {
            building_id: existingId,
            floor_number: floor.floor_number,
            total_sqm: floor.total_sqm ?? 0,
          },
          { onConflict: 'building_id,floor_number' }
        )
        .select('id')
        .single();

      if (!floorRow || !floor.blocks?.length) continue;

      for (const block of floor.blocks) {
        let tenantId: string | null = null;
        if (block.tenant_name) {
          tenantId = await upsertTenant(block.tenant_name, block.tenant_name_en);
        }

        await supabase.from('tenant_blocks').insert({
          floor_id: floorRow.id,
          tenant_id: tenantId,
          sqm: block.sqm ?? 0,
          status: block.status ?? (block.tenant_name ? 'occupied' : 'vacant'),
          is_sublease: block.is_sublease ?? false,
          sublease_tenant: block.sublease_tenant,
          sublease_end: block.sublease_end,
          available_from: block.available_from,
          delivery_condition: block.delivery_condition,
          lease_start: block.lease_start,
          lease_end: block.lease_end,
          rent_per_sqm: block.rent_per_sqm,
          management_fee_sqm: block.management_fee_sqm,
          notes: block.notes,
        });
      }
    }
  }
}

