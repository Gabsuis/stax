import { Building, Floor, TenantBlock } from "@/types"

const d = (year: number, month: number): Date => new Date(year, month - 1, 1)

const v = (sqm: number, notes?: string): TenantBlock => ({
  id: Math.random().toString(36).slice(2, 9),
  tenantName: null, sqm, status: "vacant", leaseEnd: null, notes,
})

const t = (name: string, sqm: number, leaseEnd: Date | null, notes?: string): TenantBlock => ({
  id: Math.random().toString(36).slice(2, 9),
  tenantName: name, sqm, status: "occupied", leaseEnd, notes,
})

// 1. מגדל אמפא — REAL TENANT DATA
const amphaFloors: Floor[] = [
  { floor: 1, totalSqm: 1367, blocks: [
    t("Globrands Group", 550, d(2028, 6)),
    t("JTI", 450, d(2029, 3)),
    t("BAT", 367, d(2028, 11)),
  ]},
  { floor: 2, totalSqm: 1367, blocks: [
    t("אמפא קפיטל", 700, d(2027, 9)),
    t("אמפא ישראל", 667, d(2027, 9)),
  ]},
  { floor: 3, totalSqm: 1367, blocks: [
    t("AppsFlyer", 1367, d(2028, 12)),
  ]},
  { floor: 4, totalSqm: 1367, blocks: [
    t("S.G. Gilboa Engineers", 1367, d(2026, 9)),
  ]},
  { floor: 5, totalSqm: 1367, blocks: [
    t("HCL Technologies", 900, d(2027, 6)),
    t("Innovation Africa", 467, d(2026, 8)),
  ]},
  { floor: 6, totalSqm: 1367, blocks: [
    t("LINKTRONIC LTD.", 1367, d(2026, 7)),
  ]},
  { floor: 7, totalSqm: 1367, blocks: [v(1367)] },
  { floor: 8, totalSqm: 1367, blocks: [v(1367)] },
  { floor: 9, totalSqm: 1367, blocks: [
    t("Mars Media Group", 550, d(2027, 4)),
    t("Castify.ai", 450, d(2026, 6)),
    t("Hoopo Systems Ltd", 367, d(2027, 2)),
  ]},
  { floor: 10, totalSqm: 1367, blocks: [
    t("GE Digital", 800, d(2026, 5)),
    t("Zoomd Technologies", 567, d(2026, 10)),
  ]},
  { floor: 11, totalSqm: 1367, blocks: [
    t("Made4net", 1367, d(2028, 4)),
  ]},
  { floor: 12, totalSqm: 1367, blocks: [
    t("טוויק מערכות מידע", 1367, d(2027, 11)),
  ]},
  { floor: 13, totalSqm: 1367, blocks: [
    t("KETER", 700, d(2029, 6)),
    t("גלובריום אחזקות", 400, d(2027, 3)),
    t("CIMENT", 267, d(2026, 11)),
  ]},
  { floor: 14, totalSqm: 1367, blocks: [
    t("KETER – הנהלה", 1367, d(2029, 6)),
  ]},
  { floor: 15, totalSqm: 1367, blocks: [
    t("אמפא", 350, null),
    t("אמפא נדל״ן", 250, null),
    t("האחים נקש", 200, d(2028, 6)),
    t("קבוצת ג׳ורדאש סטאי", 200, d(2027, 12)),
    t("רשת מלונות סטאי", 150, d(2027, 12)),
    t("אורכידאה", 117, d(2028, 3)),
    t("הרברט סמואל", 100, d(2027, 8)),
  ]},
]

// 2. הרצליה ביזנס פארק
const herzliyaBizFloors: Floor[] = [
  { floor: 1, totalSqm: 5000, blocks: [t("Amdocs", 5000, d(2028, 6))] },
  { floor: 2, totalSqm: 5000, blocks: [t("Amdocs", 5000, d(2028, 6))] },
  { floor: 3, totalSqm: 5000, blocks: [t("Amdocs", 3000, d(2028, 6)), v(2000)] },
  { floor: 4, totalSqm: 5000, blocks: [v(5000)] },
  { floor: 5, totalSqm: 5000, blocks: [t("Check Point", 5000, d(2027, 9))] },
  { floor: 6, totalSqm: 5000, blocks: [t("Check Point", 4100, d(2027, 9)), v(900)] },
  { floor: 7, totalSqm: 5000, blocks: [t("AudioCodes", 5000, d(2026, 8))] },
  { floor: 8, totalSqm: 5000, blocks: [t("AudioCodes", 5000, d(2026, 8))] },
  { floor: 9, totalSqm: 5000, blocks: [t("NICE Systems", 5000, d(2029, 3))] },
  { floor: 10, totalSqm: 5000, blocks: [t("NICE Systems", 5000, d(2029, 3))] },
  { floor: 11, totalSqm: 5000, blocks: [v(5000)] },
  { floor: 12, totalSqm: 5000, blocks: [v(5000)] },
  { floor: 13, totalSqm: 5000, blocks: [v(3900), t("Sela Systems", 1100, d(2027, 1))] },
  { floor: 14, totalSqm: 5000, blocks: [t("Sela Systems", 5000, d(2027, 1))] },
]

// 3. גב ים צפון
const gavYamNorthFloors: Floor[] = [
  { floor: 1, totalSqm: 3500, blocks: [t("ECI Telecom", 3500, d(2028, 12))] },
  { floor: 2, totalSqm: 3500, blocks: [t("ECI Telecom", 3500, d(2028, 12))] },
  { floor: 3, totalSqm: 3500, blocks: [v(3500)] },
  { floor: 4, totalSqm: 3500, blocks: [t("Dell", 3500, d(2026, 4))] },
  { floor: 5, totalSqm: 3500, blocks: [v(3500)] },
  { floor: 6, totalSqm: 3500, blocks: [v(3500)] },
  { floor: 7, totalSqm: 3500, blocks: [t("Ultra", 2100, d(2026, 3)), v(1400)] },
  { floor: 8, totalSqm: 3500, blocks: [t("Ceragon", 3500, d(2027, 6))] },
]

// 4. בית אקרשטיין הישן
const akersteinOldFloors: Floor[] = [
  { floor: 1, totalSqm: 1500, blocks: [t("Radcom", 1500, d(2026, 9))] },
  { floor: 2, totalSqm: 1500, blocks: [t("Radcom", 800, d(2026, 9)), v(700)] },
  { floor: 3, totalSqm: 1500, blocks: [v(1500)] },
  { floor: 4, totalSqm: 1500, blocks: [t("Telrad", 500, d(2026, 2)), v(1000)] },
]

// 5. משכית 25
const mashkit25Floors: Floor[] = [
  { floor: 1, totalSqm: 2100, blocks: [t("כלל", 700, d(2026, 1))] },
  ...Array.from({ length: 9 }, (_, i) => ({
    floor: i + 2, totalSqm: 2100, blocks: [v(2100)],
  })),
]

// 6. קוגנייט
const cogniteFloors: Floor[] = [
  { floor: 1, totalSqm: 3167, blocks: [t("Taboola", 3167, d(2028, 9))] },
  { floor: 2, totalSqm: 3167, blocks: [t("Taboola", 3167, d(2028, 9))] },
  { floor: 3, totalSqm: 3167, blocks: [t("IronSource", 3167, d(2027, 4))] },
  { floor: 4, totalSqm: 3167, blocks: [v(3167)] },
  { floor: 5, totalSqm: 3166, blocks: [t("IronSource", 2166, d(2026, 6)), v(1000)] },
  { floor: 6, totalSqm: 3166, blocks: [t("Sapiens", 3166, d(2029, 1))] },
]

// 7. גלגלי הפלדה 11
const galgaleiFloors: Floor[] = [
  { floor: 1, totalSqm: 3000, blocks: [t("Wix", 3000, d(2028, 2))] },
  { floor: 2, totalSqm: 3000, blocks: [t("Wix", 3000, d(2028, 2))] },
  { floor: 3, totalSqm: 3000, blocks: [t("Fiverr", 3000, d(2027, 8))] },
  { floor: 4, totalSqm: 3000, blocks: [t("Fiverr", 2000, d(2027, 8)), v(1000)] },
]

// 8. תאומי שדרות הגלים
const taomeiFloors: Floor[] = [
  { floor: 1, totalSqm: 1800, blocks: [t("Monday.com", 1800, d(2029, 3))] },
  { floor: 2, totalSqm: 1800, blocks: [t("Monday.com", 1800, d(2029, 3))] },
  { floor: 3, totalSqm: 1800, blocks: [t("Rapyd", 1630, d(2028, 1)), v(170)] },
  { floor: 4, totalSqm: 1800, blocks: [t("Rapyd", 1800, d(2028, 1))] },
]

// 9. מרכז גב ים שנקר
const gavYamShankerFloors: Floor[] = [
  { floor: 1, totalSqm: 5000, blocks: [t("Check Point", 4082, d(2028, 6)), v(918)] },
  { floor: 2, totalSqm: 5000, blocks: [t("Check Point", 5000, d(2028, 6))] },
  { floor: 3, totalSqm: 5000, blocks: [t("Check Point", 5000, d(2028, 6))] },
  { floor: 4, totalSqm: 5000, blocks: [t("Amdocs", 5000, d(2027, 9))] },
  { floor: 5, totalSqm: 5000, blocks: [t("Amdocs", 5000, d(2027, 9))] },
  { floor: 6, totalSqm: 5000, blocks: [t("Amdocs", 5000, d(2027, 9))] },
  { floor: 7, totalSqm: 5000, blocks: [t("ECI Telecom", 5000, d(2029, 2))] },
  { floor: 8, totalSqm: 5000, blocks: [t("ECI Telecom", 5000, d(2029, 2))] },
  { floor: 9, totalSqm: 5000, blocks: [t("NICE Systems", 5000, d(2026, 11))] },
  { floor: 10, totalSqm: 5000, blocks: [t("NICE Systems", 5000, d(2026, 11))] },
  { floor: 11, totalSqm: 5000, blocks: [t("Sapiens", 5000, d(2028, 4))] },
  { floor: 12, totalSqm: 5000, blocks: [t("Sapiens", 5000, d(2028, 4))] },
  { floor: 13, totalSqm: 5000, blocks: [t("Taboola", 5000, d(2027, 7))] },
  { floor: 14, totalSqm: 5000, blocks: [t("Taboola", 5000, d(2027, 7))] },
]

// 10. בית אמצור
const amtzurFloors: Floor[] = [
  { floor: 1, totalSqm: 4000, blocks: [t("AudioCodes", 4000, d(2027, 5))] },
  { floor: 2, totalSqm: 4000, blocks: [t("AudioCodes", 4000, d(2027, 5))] },
  { floor: 3, totalSqm: 4000, blocks: [t("Ceragon", 2460, d(2026, 10)), v(1540)] },
  { floor: 4, totalSqm: 4000, blocks: [t("Ceragon", 4000, d(2026, 10))] },
  { floor: 5, totalSqm: 4000, blocks: [t("Radcom", 4000, d(2028, 8))] },
]

// 11. מגדלי אקרשטיין C
const akersteinCFloors: Floor[] = [
  { floor: 1, totalSqm: 1400, blocks: [t("Coral", 1400, d(2026, 3))] },
  { floor: 2, totalSqm: 1400, blocks: [t("Allied", 700, d(2027, 2)), v(700)] },
  { floor: 3, totalSqm: 1400, blocks: [v(1400)] },
  { floor: 4, totalSqm: 1400, blocks: [v(1400)] },
  { floor: 5, totalSqm: 1400, blocks: [v(1400)] },
  { floor: 6, totalSqm: 1400, blocks: [t("Allied", 1400, d(2027, 2))] },
  { floor: 7, totalSqm: 1400, blocks: [t("Allied", 1400, d(2027, 2))] },
  { floor: 8, totalSqm: 1400, blocks: [t("Telrad", 1400, d(2028, 4))] },
  { floor: 9, totalSqm: 1400, blocks: [t("Telrad", 1400, d(2028, 4))] },
]

// 12. מגדלי אקרשטיין A
const akersteinAFloors: Floor[] = [
  { floor: 1, totalSqm: 1400, blocks: [t("Silicom", 1400, d(2028, 3))] },
  { floor: 2, totalSqm: 1400, blocks: [t("Silicom", 1400, d(2028, 3))] },
  { floor: 3, totalSqm: 1400, blocks: [t("Allot", 1400, d(2027, 6))] },
  { floor: 4, totalSqm: 1400, blocks: [t("Allot", 1400, d(2027, 6))] },
  { floor: 5, totalSqm: 1400, blocks: [t("DG Safe", 1400, d(2026, 6))] },
  { floor: 6, totalSqm: 1400, blocks: [v(1400)] },
  { floor: 7, totalSqm: 1400, blocks: [t("Uniphore", 1400, d(2026, 2))] },
  { floor: 8, totalSqm: 1400, blocks: [t("Regus", 350, d(2026, 2)), v(1050)] },
  { floor: 9, totalSqm: 1400, blocks: [t("Regus", 1400, d(2028, 12))] },
]

// 13. בית גראפ
const grafFloors: Floor[] = [
  { floor: 1, totalSqm: 1500, blocks: [t("Netsol", 1500, d(2028, 7))] },
  { floor: 2, totalSqm: 1500, blocks: [t("Netsol", 1500, d(2028, 7))] },
  { floor: 3, totalSqm: 1500, blocks: [t("Sapiens", 859, d(2027, 4)), v(641)] },
  { floor: 4, totalSqm: 1500, blocks: [t("Sapiens", 1500, d(2027, 4))] },
]

// 14. רוגובין ריט 1
const rogovingFloors: Floor[] = [
  { floor: 1, totalSqm: 5000, blocks: [t("Magic Software", 5000, d(2029, 1))] },
  { floor: 2, totalSqm: 5000, blocks: [t("Magic Software", 5000, d(2029, 1))] },
  { floor: 3, totalSqm: 5000, blocks: [t("Comverse", 5000, d(2027, 8))] },
  { floor: 4, totalSqm: 5000, blocks: [t("Comverse", 3900, d(2027, 8)), v(1100)] },
  { floor: 5, totalSqm: 5000, blocks: [t("IronSource", 5000, d(2028, 6))] },
]

// 15. בית תאטראות
const theatersFloors: Floor[] = [
  { floor: 1, totalSqm: 1500, blocks: [t("Taboola", 1500, d(2027, 9))] },
  { floor: 2, totalSqm: 1500, blocks: [t("Taboola", 500, d(2027, 9)), v(1000)] },
  { floor: 3, totalSqm: 1500, blocks: [t("Radcom", 1500, d(2028, 2))] },
  { floor: 4, totalSqm: 1500, blocks: [t("Radcom", 1500, d(2028, 2))] },
]

// 16. בית שער העיר
const shaarHairFloors: Floor[] = [
  { floor: 1, totalSqm: 4000, blocks: [t("Wix", 4000, d(2028, 5))] },
  { floor: 2, totalSqm: 4000, blocks: [t("Wix", 4000, d(2028, 5))] },
  { floor: 3, totalSqm: 4000, blocks: [t("Monday.com", 4000, d(2029, 3))] },
  { floor: 4, totalSqm: 4000, blocks: [t("Monday.com", 3110, d(2029, 3)), v(890)] },
  { floor: 5, totalSqm: 4000, blocks: [t("Fiverr", 4000, d(2027, 7))] },
]

// 17. HQ
const hqFloors: Floor[] = [
  { floor: 1, totalSqm: 4000, blocks: [t("Rapyd", 3000, d(2026, 6)), v(1000)] },
  { floor: 2, totalSqm: 4000, blocks: [v(4000)] },
  { floor: 3, totalSqm: 4000, blocks: [v(4000)] },
  { floor: 4, totalSqm: 4000, blocks: [v(4000)] },
  { floor: 5, totalSqm: 4000, blocks: [v(4000)] },
  { floor: 6, totalSqm: 4000, blocks: [v(4000)] },
]

export const buildings: Building[] = [
  { id: 1, name: "מגדל אמפא", nameEn: "Ampa Tower",
    owner: "אמפא", address: "ספיר 7, הרצליה פיתוח", area: "center",
    class: "A", floorCount: 15, floorSize: 1367, totalSqm: 20500, vacantSqm: 1700,
    askingPrice: 90, allowance: "TBD", finish: "As-Is New",
    parkingPrice: "650 ₪ צפה + 80 ₪ ארנונה", managementFee: 22,
    contact: "—", phone: "—", notes: "קומות 7-8 פנויות",
    occupancy: 0.917, floors: amphaFloors },

  { id: 2, name: "הרצליה ביזנס פארק", nameEn: "Herzliya Business Park",
    owner: "—", address: "מדינת היהודים 85, הרצליה", area: "north",
    class: "A/B", floorCount: 14, floorSize: 5000, totalSqm: 70000, vacantSqm: 20900,
    askingPrice: 85, allowance: "2,000 ₪", finish: "As-Is New",
    parkingPrice: "800 ₪ צפה / 1,000 ₪ שמורה", managementFee: 28.5,
    contact: "ירדן", phone: "052-2988654",
    notes: "20,000 מ״ר בגמר + 900 מ״ר קומה 6",
    occupancy: 0.701, floors: herzliyaBizFloors },

  { id: 3, name: "גב ים צפון", nameEn: "Gav-Yam North",
    owner: "גב-ים", address: "המדע 5, הרצליה", area: "north",
    class: "A", floorCount: 8, floorSize: 3500, totalSqm: 28000, vacantSqm: 5000,
    askingPrice: 90, allowance: "2,000 ₪", finish: "As-Is New",
    parkingPrice: "750 ₪ צפה / 1,200 ₪ שמורה", managementFee: 20,
    contact: "אבי מנהל שיווק", phone: "052-3452553",
    notes: "קומה 7: Ultra מתפנה במרץ · קומה 3: Dell מתפנה באפריל",
    occupancy: 0.821, floors: gavYamNorthFloors },

  { id: 4, name: "בית אקרשטיין הישן", nameEn: "Akerstein Old Building",
    owner: "—", address: "המדע 8, הרצליה", area: "north",
    class: "C", floorCount: 4, floorSize: 1500, totalSqm: 6000, vacantSqm: 2000,
    askingPrice: 70, allowance: "1,000 ₪", finish: "As-Is",
    parkingPrice: "750 ₪ + מע\"מ", managementFee: 0,
    contact: "גיא כהן", phone: "050-7617617",
    notes: "המבנה מיועד להריסה בעוד שנה",
    occupancy: 0.667, floors: akersteinOldFloors },

  { id: 5, name: "משכית 25", nameEn: "Mashkit 25",
    owner: "כלל", address: "משכית 25, הרצליה", area: "center",
    class: "A", floorCount: 10, floorSize: 2100, totalSqm: 21000, vacantSqm: 20300,
    askingPrice: 85, allowance: "TBD", finish: "As-Is / Shell & Core",
    parkingPrice: "800 ₪ + 110 ₪ דמ\"נ", managementFee: 0,
    contact: "אמיר כלל", phone: "—",
    notes: "20 חניות · עסקת switch up בוטלה",
    occupancy: 0.033, floors: mashkit25Floors },

  { id: 6, name: "קוגנייט", nameEn: "Cognyte",
    owner: "—", address: "משכית 33, הרצליה", area: "center",
    class: "A/B", floorCount: 6, floorSize: 3167, totalSqm: 19000, vacantSqm: 4000,
    askingPrice: 80, allowance: "1,000 ₪", finish: "As-Is",
    parkingPrice: "700 ₪ + 100 ₪ ארנונה", managementFee: 19,
    contact: "—", phone: "—", notes: "קומה 4 פנויה",
    occupancy: 0.789, floors: cogniteFloors },

  { id: 7, name: "גלגלי הפלדה 11", nameEn: "Galgalei HaPalada 11",
    owner: "—", address: "גלגלי הפלדה 11, הרצליה", area: "center",
    class: "B", floorCount: 4, floorSize: 3000, totalSqm: 12000, vacantSqm: 1000,
    askingPrice: 80, allowance: "500 ₪", finish: "As-Is",
    parkingPrice: "—", managementFee: 20,
    contact: "—", phone: "—", notes: "קומה 4 פנויה חלקית",
    occupancy: 0.917, floors: galgaleiFloors },

  { id: 8, name: "תאומי שדרות הגלים", nameEn: "Taomei Sderot HaGalim",
    owner: "—", address: "אבא אבן 8, הרצליה", area: "center",
    class: "A", floorCount: 4, floorSize: 1800, totalSqm: 7200, vacantSqm: 170,
    askingPrice: 75, allowance: "0", finish: "As-Is",
    parkingPrice: "500 ₪", managementFee: 24,
    contact: "דניאל מנהל מגדל", phone: "054-4222039",
    notes: "יש גם שטחים בקניון ארנה",
    occupancy: 0.976, floors: taomeiFloors },

  { id: 9, name: "מרכז גב ים שנקר", nameEn: "Gav-Yam Shanker Center",
    owner: "גב-ים", address: "שנקר, הרצליה", area: "south",
    class: "A", floorCount: 14, floorSize: 5000, totalSqm: 70000, vacantSqm: 1868,
    askingPrice: 85, allowance: "TBD", finish: "As-Is",
    parkingPrice: "750 ₪ צפה / 1,200 ₪ שמורה", managementFee: 20,
    contact: "אבי מנהל שיווק", phone: "052-3452553",
    notes: "קומה 1: 918 מ\"ר בגמר",
    occupancy: 0.973, floors: gavYamShankerFloors },

  { id: 10, name: "בית אמצור", nameEn: "Amtzur House",
    owner: "—", address: "הסדנאות 8, הרצליה", area: "south",
    class: "B", floorCount: 5, floorSize: 4000, totalSqm: 20000, vacantSqm: 1540,
    askingPrice: 80, allowance: "1,000 ₪", finish: "As-Is",
    parkingPrice: "—", managementFee: 0,
    contact: "—", phone: "—", notes: "קומות 3-4 פנויות חלקית",
    occupancy: 0.923, floors: amtzurFloors },

  { id: 11, name: "מגדלי אקרשטיין C", nameEn: "Akerstein Towers C",
    owner: "—", address: "אבא אבן 10, הרצליה", area: "south",
    class: "A", floorCount: 9, floorSize: 1400, totalSqm: 12600, vacantSqm: 5162,
    askingPrice: 110, allowance: "TBD", finish: "As-Is High Level",
    parkingPrice: "850 ₪ צפה / 1,000 ₪ קבועה", managementFee: 25.5,
    contact: "—", phone: "—",
    notes: "קורל מפנה במרץ 700 מ\"ר",
    occupancy: 0.590, floors: akersteinCFloors },

  { id: 12, name: "מגדלי אקרשטיין A", nameEn: "Akerstein Towers A",
    owner: "—", address: "המנופים 9-11, הרצליה", area: "south",
    class: "A", floorCount: 9, floorSize: 1400, totalSqm: 12600, vacantSqm: 3750,
    askingPrice: 110, allowance: "TBD", finish: "As-Is High Level",
    parkingPrice: "750 ₪ צפה / 1,200 ₪ שמורה", managementFee: 25.5,
    contact: "יואב מנהל שיווק", phone: "054-7826236",
    notes: "Uniphore + Regus מתפנים פברואר · DG Safe מתפנה ביוני",
    occupancy: 0.702, floors: akersteinAFloors },

  { id: 13, name: "בית גראפ", nameEn: "Graf House",
    owner: "—", address: "שנקר 4, הרצליה", area: "south",
    class: "A", floorCount: 4, floorSize: 1500, totalSqm: 6000, vacantSqm: 641,
    askingPrice: 100, allowance: "ללא", finish: "As-Is New",
    parkingPrice: "750 ₪", managementFee: 22.5,
    contact: "—", phone: "—", notes: "",
    occupancy: 0.893, floors: grafFloors },

  { id: 14, name: "רוגובין ריט 1", nameEn: "Rogovin REIT 1",
    owner: "—", address: "המנופים 10, הרצליה", area: "south",
    class: "A", floorCount: 5, floorSize: 5000, totalSqm: 25000, vacantSqm: 1100,
    askingPrice: 100, allowance: "ללא", finish: "As-Is",
    parkingPrice: "800 ₪", managementFee: 18,
    contact: "בר", phone: "054-4237866", notes: "",
    occupancy: 0.956, floors: rogovingFloors },

  { id: 15, name: "בית תאטראות", nameEn: "Theaters House",
    owner: "—", address: "משכית / מדינת היהודים, הרצליה", area: "north",
    class: "A/B", floorCount: 4, floorSize: 1500, totalSqm: 6000, vacantSqm: 1000,
    askingPrice: 85, allowance: "—", finish: "בגמר",
    parkingPrice: "750 ₪", managementFee: 21,
    contact: "יוסי מנהל בניין", phone: "054-4462533",
    notes: "בגמר — צריך שיפוץ רציני",
    occupancy: 0.833, floors: theatersFloors },

  { id: 16, name: "בית שער העיר", nameEn: "Shaar HaIr House",
    owner: "—", address: "אבא אבן / שנקר 1, הרצליה", area: "south",
    class: "A/B", floorCount: 5, floorSize: 4000, totalSqm: 20000, vacantSqm: 890,
    askingPrice: 0, allowance: "—", finish: "—",
    parkingPrice: "—", managementFee: 0,
    contact: "—", phone: "—", notes: "",
    occupancy: 0.9555, floors: shaarHairFloors },

  { id: 17, name: "HQ", nameEn: "HQ Building",
    owner: "—", address: "הרצליה", area: "",
    class: "A", floorCount: 6, floorSize: 4000, totalSqm: 24000, vacantSqm: 21000,
    askingPrice: 90, allowance: "TBD", finish: "Shell & Core",
    parkingPrice: "—", managementFee: 0,
    contact: "—", phone: "—",
    notes: "שטחים פנויים לחלוטין — בנייה חדשה",
    occupancy: 0.125, floors: hqFloors },
]
