// ────────────────────────────────────────────────────────────
// Enums — match database.sql
// ────────────────────────────────────────────────────────────

export type BlockStatus = "vacant" | "occupied"
export type BuildingClass = "A+" | "A" | "A/B" | "B" | "C"
export type LeaseUrgency = "safe" | "watch" | "urgent" | "unknown"
export type AreaRegion = "north" | "center" | "south"
export type DeliveryCondition =
  | "shell_and_core"
  | "as_is"
  | "as_is_new"
  | "as_is_high_level"
  | "turnkey"
  | "furnished"
  | "furnished_equipped"
  | "renovation_required"
export type LeedRating = "certified" | "silver" | "gold" | "platinum" | "none" | "unknown"
export type ParkingType = "open" | "reserved" | "underground"
export type AmenityType =
  | "restaurant" | "cafe" | "gym" | "retail" | "lobby_lounge"
  | "conference_center" | "daycare" | "synagogue" | "shower_rooms"
  | "bike_storage" | "rooftop_terrace" | "ev_charging" | "other"

// ────────────────────────────────────────────────────────────
// Owner
// ────────────────────────────────────────────────────────────

export interface Owner {
  id: string
  name: string
  name_en?: string | null
  email?: string | null
  phone?: string | null
}

// ────────────────────────────────────────────────────────────
// Tenant (company)
// ────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  name_en?: string | null
  industry?: string | null
}

// ────────────────────────────────────────────────────────────
// Parking option
// ────────────────────────────────────────────────────────────

export interface ParkingOption {
  id: string
  parking_type: ParkingType
  price_monthly?: number | null
  management_fee?: number | null
  spaces_available?: number | null
  notes?: string | null
}

// ────────────────────────────────────────────────────────────
// Tenant Block — the stacking plan unit
// ────────────────────────────────────────────────────────────

export interface TenantBlock {
  id: string
  tenantName: string | null         // kept for backward compat with demo
  tenant?: Tenant | null            // full tenant object from Supabase
  sqm: number
  status: BlockStatus
  leaseEnd: Date | null
  leaseStart?: Date | null
  notes?: string

  // Sublease
  isSublease?: boolean
  subleaseTenant?: string | null
  subleaseEnd?: Date | null

  // Availability
  availableFrom?: Date | null
  deliveryCondition?: DeliveryCondition | null

  // Financial
  rentPerSqm?: number | null
  managementFeeSqm?: number | null
  escalationPct?: number | null
  escalationIndex?: string | null

  // Options
  optionPeriods?: number
  optionYears?: number

  // Timestamps
  createdAt?: string
  updatedAt?: string
}

// ────────────────────────────────────────────────────────────
// Floor
// ────────────────────────────────────────────────────────────

export interface Floor {
  id?: string
  floor: number
  totalSqm: number
  blocks: TenantBlock[]
  floorPlanUrl?: string | null
  notes?: string | null
}

// ────────────────────────────────────────────────────────────
// Building
// ────────────────────────────────────────────────────────────

export interface Building {
  id: number | string               // number for demo, UUID string for Supabase
  name: string
  nameEn: string
  owner: string                     // kept for backward compat (demo uses string)
  ownerObj?: Owner | null           // full owner from Supabase
  address: string
  city?: string
  cityEn?: string
  area: AreaRegion | ""
  class: BuildingClass
  floorCount: number
  floorSize: number
  totalSqm: number
  vacantSqm: number
  askingPrice: number
  allowance: string
  finish: string                    // kept for backward compat
  deliveryCondition?: DeliveryCondition | null
  parkingPrice: string              // kept for backward compat
  managementFee: number
  contact: string                   // kept for backward compat
  phone: string                     // kept for backward compat
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  notes: string
  occupancy: number
  floors: Floor[]

  // New from schema
  yearBuilt?: number | null
  leedRating?: LeedRating | null
  municipalTaxSqm?: number | null
  distanceTrainKm?: number | null
  distanceLightRailKm?: number | null
  parkingSpaces?: number | null
  parkingRatio?: number | null
  heroImageUrl?: string | null

  // Relations
  amenities?: AmenityType[]
  parkingOptions?: ParkingOption[]

  // Document trail
  sourceDocumentId?: string | null
  sourceDocumentName?: string | null

  // Timestamps
  createdAt?: string
  updatedAt?: string
}
