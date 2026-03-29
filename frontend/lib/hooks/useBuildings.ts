import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-client';
import { buildings as mockBuildings } from '@/data/buildings';
import type { Building, Floor, TenantBlock, ParkingOption } from '@/types';

interface UseBuildings {
  buildings: Building[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// Normalize any Hebrew area values from legacy DB rows to English enums
const AREA_NORMALIZE: Record<string, string> = {
  'צפון': 'north',
  'מרכז': 'center',
  'דרום': 'south',
};
function normalizeArea(raw: string | null): Building['area'] {
  if (!raw) return '';
  return (AREA_NORMALIZE[raw] || raw) as Building['area'];
}

export function useBuildings(): UseBuildings {
  const [buildings, setBuildings] = useState<Building[]>(mockBuildings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuildings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: rows, error: fetchError } = await supabaseBrowser
        .from('buildings')
        .select(`
          *,
          owners ( id, name, name_en, email, phone ),
          building_amenities ( amenity ),
          parking_options ( id, parking_type, price_monthly, management_fee, spaces_available, notes ),
          floors (
            id, floor_number, total_sqm, floor_plan_url, notes,
            tenant_blocks (
              id, sqm, status, lease_start, lease_end, notes,
              is_sublease, sublease_tenant, sublease_end,
              available_from, delivery_condition,
              rent_per_sqm, management_fee_sqm,
              escalation_pct, escalation_index,
              option_periods, option_years,
              created_at, updated_at,
              tenants ( id, name, name_en, industry )
            )
          ),
          documents!buildings_source_document_id_fkey ( id, file_name, created_at )
        `)
        .order('name');

      if (fetchError) {
        // If Supabase query fails (e.g. no data yet), fall back to mock
        console.warn('Supabase fetch failed, using mock data:', fetchError.message);
        setBuildings(mockBuildings);
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        // No data in Supabase yet — use mock
        setBuildings(mockBuildings);
        setLoading(false);
        return;
      }

      // Transform Supabase rows to Building type
      const transformed: Building[] = rows.map((row: Record<string, unknown>) => {
        const owner = row.owners as Record<string, unknown> | null;
        const amenityRows = (row.building_amenities as Array<{ amenity: string }>) ?? [];
        const parkingRows = (row.parking_options as ParkingOption[]) ?? [];
        const floorRows = (row.floors as Array<Record<string, unknown>>) ?? [];
        const sourceDoc = row.documents as Record<string, unknown> | null;

        const floors: Floor[] = floorRows
          .sort((a, b) => (a.floor_number as number) - (b.floor_number as number))
          .map((f) => {
            const blockRows = (f.tenant_blocks as Array<Record<string, unknown>>) ?? [];
            const blocks: TenantBlock[] = blockRows.map((b) => {
              const tenant = b.tenants as Record<string, unknown> | null;
              return {
                id: b.id as string,
                tenantName: tenant ? (tenant.name as string) : null,
                tenant: tenant ? {
                  id: tenant.id as string,
                  name: tenant.name as string,
                  name_en: tenant.name_en as string | null,
                  industry: tenant.industry as string | null,
                } : null,
                sqm: b.sqm as number,
                status: b.status as 'vacant' | 'occupied',
                leaseEnd: b.lease_end ? new Date(b.lease_end as string) : null,
                leaseStart: b.lease_start ? new Date(b.lease_start as string) : null,
                notes: b.notes as string | undefined,
                isSublease: b.is_sublease as boolean,
                subleaseTenant: b.sublease_tenant as string | null,
                subleaseEnd: b.sublease_end ? new Date(b.sublease_end as string) : null,
                availableFrom: b.available_from ? new Date(b.available_from as string) : null,
                deliveryCondition: b.delivery_condition as TenantBlock['deliveryCondition'],
                rentPerSqm: b.rent_per_sqm as number | null,
                managementFeeSqm: b.management_fee_sqm as number | null,
                escalationPct: b.escalation_pct as number | null,
                escalationIndex: b.escalation_index as string | null,
                optionPeriods: b.option_periods as number,
                optionYears: b.option_years as number,
                createdAt: b.created_at as string,
                updatedAt: b.updated_at as string,
              };
            });

            return {
              id: f.id as string,
              floor: f.floor_number as number,
              totalSqm: f.total_sqm as number,
              blocks,
              floorPlanUrl: f.floor_plan_url as string | null,
              notes: f.notes as string | null,
            };
          });

        const area = row.area as string | null;

        return {
          id: row.id as string,
          name: row.name as string,
          nameEn: (row.name_en as string) ?? '',
          owner: owner ? (owner.name as string) : '—',
          ownerObj: owner ? {
            id: owner.id as string,
            name: owner.name as string,
            name_en: owner.name_en as string | null,
            email: owner.email as string | null,
            phone: owner.phone as string | null,
          } : null,
          address: row.address as string,
          city: row.city as string,
          cityEn: row.city_en as string,
          area: normalizeArea(area),
          class: row.class as Building['class'],
          floorCount: row.floor_count as number,
          floorSize: row.typical_floor_sqm as number,
          totalSqm: row.total_sqm as number,
          vacantSqm: row.vacant_sqm as number,
          askingPrice: (row.asking_rent_sqm as number) ?? 0,
          allowance: (row.allowance as string) ?? '',
          finish: (row.delivery_condition as string) ?? '',
          deliveryCondition: row.delivery_condition as Building['deliveryCondition'],
          parkingPrice: '',
          managementFee: (row.management_fee_sqm as number) ?? 0,
          contact: (row.contact_name as string) ?? '—',
          phone: (row.contact_phone as string) ?? '—',
          contactName: row.contact_name as string | null,
          contactPhone: row.contact_phone as string | null,
          contactEmail: row.contact_email as string | null,
          notes: (row.notes as string) ?? '',
          occupancy: (row.occupancy_rate as number) ?? 0,
          floors,

          // New fields
          yearBuilt: row.year_built as number | null,
          leedRating: row.leed_rating as Building['leedRating'],
          municipalTaxSqm: row.municipal_tax_sqm as number | null,
          distanceTrainKm: row.distance_train_km as number | null,
          distanceLightRailKm: row.distance_light_rail_km as number | null,
          parkingSpaces: row.parking_spaces as number | null,
          parkingRatio: row.parking_ratio as number | null,
          heroImageUrl: row.hero_image_url as string | null,
          latitude: (row.latitude as number) ?? null,
          longitude: (row.longitude as number) ?? null,
          amenities: amenityRows.map((a) => a.amenity as Building['amenities'] extends (infer U)[] ? U : never),
          parkingOptions: parkingRows,
          sourceDocumentId: row.source_document_id as string | null,
          sourceDocumentName: sourceDoc ? (sourceDoc.file_name as string) : null,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        };
      });

      setBuildings(transformed);
    } catch (err) {
      console.warn('Supabase connection failed, using mock data:', err);
      setBuildings(mockBuildings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  return { buildings, loading, error, refetch: fetchBuildings };
}
