import { supabaseBrowser } from './supabase-client'
import type { EditorBuilding } from '@/components/StackingPlanEditor'

// UUID regex to detect if building was loaded from DB vs created fresh in editor
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
}

function resolveCityEn(city?: string, cityEn?: string): string {
  if (cityEn) return cityEn
  if (city && CITY_EN_MAP[city]) return CITY_EN_MAP[city]
  if (city) return city
  return ''
}

async function upsertTenant(name: string): Promise<string> {
  const { data: existing } = await supabaseBrowser
    .from('tenants')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabaseBrowser
    .from('tenants')
    .insert({ name })
    .select('id')
    .single()

  return created!.id
}

async function recalcBuildingStats(buildingId: string) {
  const { data: floorRows } = await supabaseBrowser
    .from('floors')
    .select('id')
    .eq('building_id', buildingId)

  if (!floorRows?.length) return

  const { data: blocks } = await supabaseBrowser
    .from('tenant_blocks')
    .select('sqm, status')
    .in('floor_id', floorRows.map(f => f.id))

  if (!blocks?.length) return

  const totalSqm = blocks.reduce((sum, b) => sum + (b.sqm || 0), 0)
  const vacantSqm = blocks
    .filter(b => b.status === 'vacant')
    .reduce((sum, b) => sum + (b.sqm || 0), 0)
  const occupancyRate = totalSqm > 0 ? (totalSqm - vacantSqm) / totalSqm : 0

  await supabaseBrowser
    .from('buildings')
    .update({
      total_sqm: totalSqm,
      vacant_sqm: vacantSqm,
      occupancy_rate: occupancyRate,
      floor_count: floorRows.length,
    })
    .eq('id', buildingId)
}

/**
 * Save editor buildings to Supabase.
 * - Existing buildings (UUID id) → update metadata, replace floors+blocks
 * - New buildings (short id) → insert everything fresh
 * Returns the saved building UUIDs (so editor can update its IDs for subsequent saves).
 */
export async function saveEditorBuildings(
  buildings: EditorBuilding[]
): Promise<string[]> {
  const savedIds: string[] = []

  for (const building of buildings) {
    const isExisting = UUID_RE.test(building.id)
    let buildingId: string

    if (isExisting) {
      // Update existing building metadata
      const { error } = await supabaseBrowser
        .from('buildings')
        .update({
          name: building.name,
          name_en: building.nameEn || null,
          address: building.address,
          city: building.city || null,
          city_en: resolveCityEn(building.city, building.cityEn),
          floor_count: building.floors.length,
        })
        .eq('id', building.id)

      if (error) throw new Error(`Failed to update building: ${error.message}`)

      // Delete old floors — cascades to tenant_blocks
      await supabaseBrowser
        .from('floors')
        .delete()
        .eq('building_id', building.id)

      buildingId = building.id
    } else {
      // Insert new building
      const { data: row, error } = await supabaseBrowser
        .from('buildings')
        .insert({
          name: building.name,
          name_en: building.nameEn || null,
          address: building.address,
          city: building.city || null,
          city_en: resolveCityEn(building.city, building.cityEn),
          floor_count: building.floors.length,
          class: 'A',
          typical_floor_sqm: 0,
          total_sqm: 0,
          vacant_sqm: 0,
        })
        .select('id')
        .single()

      if (error || !row) throw new Error(`Failed to insert building: ${error?.message}`)
      buildingId = row.id
    }

    // Insert floors + tenant blocks
    for (const floor of building.floors) {
      const floorSqm = floor.tenants.reduce((sum, t) => sum + (t.sqm || 0), 0)

      const { data: floorRow } = await supabaseBrowser
        .from('floors')
        .insert({
          building_id: buildingId,
          floor_number: floor.floorNumber,
          total_sqm: floorSqm,
        })
        .select('id')
        .single()

      if (!floorRow) continue

      for (const tenant of floor.tenants) {
        let tenantId: string | null = null
        if (tenant.name.trim()) {
          tenantId = await upsertTenant(tenant.name.trim())
        }

        await supabaseBrowser
          .from('tenant_blocks')
          .insert({
            floor_id: floorRow.id,
            tenant_id: tenantId,
            sqm: tenant.sqm || 0,
            status: tenant.isVacant || !tenant.name.trim() ? 'vacant' : 'occupied',
            lease_start: tenant.leaseStart ? `${tenant.leaseStart}-01` : null,
            lease_end: tenant.leaseEnd ? `${tenant.leaseEnd}-01` : null,
            rent_per_sqm: tenant.rentPerSqm ?? null,
            management_fee_sqm: tenant.managementFeeSqm ?? null,
            delivery_condition: tenant.deliveryCondition || null,
            is_sublease: tenant.isSublease || false,
            sublease_tenant: tenant.subleaseTenant || null,
            notes: tenant.notes || null,
          })
      }
    }

    // Recalculate aggregated stats
    await recalcBuildingStats(buildingId)
    savedIds.push(buildingId)
  }

  return savedIds
}
