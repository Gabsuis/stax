import { z } from 'zod/v4';

// ────────────────────────────────────────────────────────────
// Enums — mirror database.sql exactly
// ────────────────────────────────────────────────────────────

export const documentTypeEnum = z.enum([
  'lease_agreement',
  'fee_agreement_tenant',
  'fee_agreement_landlord',
  'building_brochure',
  'vacancy_listing',
  'multi_building_catalog',
  'broker_listing',
  'floor_plan',
  'building_photo',
  'building_video',
  'proposal',
  'correspondence',
  'other',
]);

export const buildingClassEnum = z.enum(['A+', 'A', 'A/B', 'B', 'C']);

export const blockStatusEnum = z.enum(['vacant', 'occupied']);

export const areaRegionEnum = z.enum(['north', 'center', 'south']);

export const deliveryConditionEnum = z.enum([
  'shell_and_core',
  'as_is',
  'as_is_new',
  'as_is_high_level',
  'turnkey',
  'furnished',
  'furnished_equipped',
  'renovation_required',
]);

export const leedRatingEnum = z.enum([
  'certified', 'silver', 'gold', 'platinum', 'none', 'unknown',
]);

export const parkingTypeEnum = z.enum(['open', 'reserved', 'underground']);

export const amenityTypeEnum = z.enum([
  'restaurant', 'cafe', 'gym', 'retail', 'lobby_lounge',
  'conference_center', 'daycare', 'synagogue', 'shower_rooms',
  'bike_storage', 'rooftop_terrace', 'ev_charging', 'other',
]);

// ────────────────────────────────────────────────────────────
// Block extraction — the stacking plan unit
// ────────────────────────────────────────────────────────────

export const blockExtractionSchema = z.object({
  tenant_name: z.string().optional(),
  tenant_name_en: z.string().optional(),
  sqm: z.number().optional(),
  status: blockStatusEnum.optional(),

  // Sublease (from real docs: שכירות משנה)
  is_sublease: z.boolean().optional(),
  sublease_tenant: z.string().optional(),
  sublease_end: z.string().optional(),        // ISO date YYYY-MM-DD

  // Availability
  available_from: z.string().optional(),       // ISO date or null = immediate
  delivery_condition: deliveryConditionEnum.optional(),

  // Lease terms
  lease_start: z.string().optional(),          // ISO date
  lease_end: z.string().optional(),            // ISO date

  // Financial
  rent_per_sqm: z.number().optional(),
  management_fee_sqm: z.number().optional(),
  escalation_pct: z.number().optional(),
  escalation_index: z.string().optional(),     // "CPI", "fixed", etc.

  // Options
  option_periods: z.number().optional(),
  option_years: z.number().optional(),

  notes: z.string().optional(),
});

// ────────────────────────────────────────────────────────────
// Floor extraction
// ────────────────────────────────────────────────────────────

export const floorExtractionSchema = z.object({
  floor_number: z.number(),
  total_sqm: z.number().optional(),
  blocks: z.array(blockExtractionSchema).optional(),
});

// ────────────────────────────────────────────────────────────
// Parking option
// ────────────────────────────────────────────────────────────

export const parkingOptionSchema = z.object({
  parking_type: parkingTypeEnum,
  price_monthly: z.number().optional(),
  management_fee: z.number().optional(),
  spaces_available: z.number().optional(),
  notes: z.string().optional(),
});

// ────────────────────────────────────────────────────────────
// Owner
// ────────────────────────────────────────────────────────────

export const ownerExtractionSchema = z.object({
  name: z.string(),
  name_en: z.string().optional(),
});

// ────────────────────────────────────────────────────────────
// Building extraction — the main unit
// ────────────────────────────────────────────────────────────

export const buildingExtractionSchema = z.object({
  // Identity
  name: z.string(),
  name_en: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  city_en: z.string().optional(),
  area: areaRegionEnum.optional(),

  // Classification
  class: buildingClassEnum.optional(),
  year_built: z.number().optional(),
  leed_rating: leedRatingEnum.optional(),

  // Dimensions
  floor_count: z.number().optional(),
  typical_floor_sqm: z.number().optional(),
  total_sqm: z.number().optional(),
  vacant_sqm: z.number().optional(),
  occupancy_rate: z.number().optional(),       // 0.0 to 1.0

  // Pricing
  asking_rent_sqm: z.number().optional(),
  management_fee_sqm: z.number().optional(),
  municipal_tax_sqm: z.number().optional(),
  allowance: z.string().optional(),
  delivery_condition: deliveryConditionEnum.optional(),

  // Parking
  parking_spaces: z.number().optional(),
  parking_ratio: z.number().optional(),
  parking_options: z.array(parkingOptionSchema).optional(),

  // Transit
  distance_train_km: z.number().optional(),
  distance_light_rail_km: z.number().optional(),

  // Contact
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),

  // Owner
  owner: ownerExtractionSchema.optional(),

  // Amenities
  amenities: z.array(amenityTypeEnum).optional(),

  // Floors + blocks
  floors: z.array(floorExtractionSchema).optional(),

  // Notes
  notes: z.string().optional(),

  // AI confidence (0.0 to 1.0)
  _confidence: z.number().optional(),
});

// ────────────────────────────────────────────────────────────
// Step 1 output: Classification (Flash — fast)
// ────────────────────────────────────────────────────────────

export const classificationSchema = z.object({
  document_type: documentTypeEnum,
  language: z.enum(['he', 'en', 'mixed']),
  building_count: z.number(),
  summary: z.string(),  // brief description of what's in the doc
});

// ────────────────────────────────────────────────────────────
// Step 2 output: Full extraction (Pro — deep thinking)
// ────────────────────────────────────────────────────────────

export const extractionResultSchema = z.object({
  document_type: documentTypeEnum,
  language: z.enum(['he', 'en', 'mixed']),
  buildings: z.array(buildingExtractionSchema),
});

// ────────────────────────────────────────────────────────────
// Step 3 output: Validation (Flash — fast)
// ────────────────────────────────────────────────────────────

export const validationResultSchema = z.object({
  is_valid: z.boolean(),
  buildings_validated: z.number(),
  issues: z.array(z.object({
    building_index: z.number(),
    field: z.string(),
    issue: z.string(),
    severity: z.enum(['error', 'warning', 'info']),
  })).optional(),
  corrected_buildings: z.array(buildingExtractionSchema).optional(),
});

// ────────────────────────────────────────────────────────────
// TypeScript types (inferred from Zod)
// ────────────────────────────────────────────────────────────

export type BlockExtraction = z.infer<typeof blockExtractionSchema>;
export type FloorExtraction = z.infer<typeof floorExtractionSchema>;
export type BuildingExtraction = z.infer<typeof buildingExtractionSchema>;
export type Classification = z.infer<typeof classificationSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
