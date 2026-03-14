export type BlockStatus = "vacant" | "occupied"
export type BuildingClass = "A" | "A/B" | "B" | "C"
export type LeaseUrgency = "safe" | "watch" | "urgent" | "unknown"

export interface TenantBlock {
  id: string
  tenantName: string | null
  sqm: number
  status: BlockStatus
  leaseEnd: Date | null
  notes?: string
}

export interface Floor {
  floor: number
  totalSqm: number
  blocks: TenantBlock[]
}

export interface Building {
  id: number
  name: string
  nameEn: string
  owner: string
  address: string
  area: "צפון" | "מרכז" | "דרום" | ""
  class: BuildingClass
  floorCount: number
  floorSize: number
  totalSqm: number
  vacantSqm: number
  askingPrice: number
  allowance: string
  finish: string
  parkingPrice: string
  managementFee: number
  contact: string
  phone: string
  notes: string
  occupancy: number
  floors: Floor[]
}
