import { SequentialAgent, LlmAgent, InMemoryRunner } from '@google/adk';
import { Type, Schema, ThinkingLevel } from '@google/genai';

const FLASH = 'gemini-3.1-flash-lite-preview';

// ════════════════════════════════════════════════════════════
// STEP 0: PARSER
// The ONLY agent that reads the raw PDF. Extracts everything
// into clean text so downstream agents never touch the PDF.
// Thinking: MEDIUM — must carefully read every page
// ════════════════════════════════════════════════════════════

const parserSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    page_count: { type: Type.INTEGER },
    full_text: { type: Type.STRING, description: 'Complete document text with ---PAGE N--- separators' },
    tables: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          page: { type: Type.INTEGER },
          description: { type: Type.STRING },
          data: { type: Type.STRING, description: 'Pipe-separated table rows' },
        },
      },
    },
    images_described: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          page: { type: Type.INTEGER },
          description: { type: Type.STRING },
        },
      },
    },
    contacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          title: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING },
        },
      },
    },
  },
  required: ['page_count', 'full_text'],
};

const parserAgent = new LlmAgent({
  name: 'parser',
  model: FLASH,
  instruction: `You are a document OCR/parser for Israeli commercial real estate documents.

YOUR ONLY JOB: Read the entire uploaded document and dump ALL content as structured text. Do not analyze, interpret, or summarize — just extract faithfully.

CRITICAL PATTERNS IN ISRAELI CRE DOCUMENTS:
1. Numbers near "מ"ר" or "sqm" are AREAS in square meters
2. Numbers near "₪" or "ש״ח" or "ILS" are PRICES in Israeli Shekels
3. Numbers formatted as "XX ₪" next to labels like "מחיר למ"ר" (price per sqm), "דמי ניהול" (management fee), "חנייה" (parking) are per-sqm monthly rates
4. Hebrew dates: "30/6/28" means June 30, 2028. "יוני 2027" means June 2027.
5. Contact blocks often have: name, title, mobile number (+972-XX-XXXXXXX), email
6. Building class appears as a single letter: A+, A, B, C — sometimes in a small badge or label
7. Floor numbers: "קומה 11" = floor 11, "20th Floor" = floor 20
8. "שכירות משנה" or "יחידה בשכירות משנה" = this is a SUBLEASE listing
9. Availability: "זמינות מיידית" or "אכלוס מיידי" = available immediately

EXTRACTION RULES:
- Read EVERY page cover to cover
- Preserve ALL numbers exactly as written
- For tables and visual layouts: extract as pipe-separated data (column|column|column)
- For images: describe what you see (floor plan, building exterior, map, etc.)
- For contacts: extract name, title, every phone number, every email
- Separate pages with ---PAGE N---
- Include title lines, headers, small print, footnotes — EVERYTHING`,
  outputSchema: parserSchema,
  outputKey: 'parsed_content',
  includeContents: 'default',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 1: CLASSIFY
// Quick classification from parsed text
// Thinking: LOW — straightforward categorization
// ════════════════════════════════════════════════════════════

const classifySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    document_type: { type: Type.STRING },
    language: { type: Type.STRING },
    building_count: { type: Type.INTEGER },
    is_sublease: { type: Type.BOOLEAN, description: 'true if the document mentions שכירות משנה or sublease' },
    summary: { type: Type.STRING },
  },
  required: ['document_type', 'language', 'building_count', 'summary'],
};

const classifierAgent = new LlmAgent({
  name: 'classifier',
  model: FLASH,
  instruction: `From the parsed document content below, classify this document.

## Parsed content:
{parsed_content}

Determine:
- document_type: "vacancy_listing" (one space for rent/sublease), "building_brochure" (one building marketing), "multi_building_catalog" (newsletter with many buildings like "מידעון"), "broker_listing" (broker inventory like "דיוור מתווכים"), "lease_agreement", "floor_plan", "other"
- language: "he", "en", or "mixed"
- building_count: how many DISTINCT buildings (not floors/units)
- is_sublease: true if "שכירות משנה" or "sublease" or "sub-let" appears
- summary: one sentence describing the document`,
  outputSchema: classifySchema,
  outputKey: 'classification',
  includeContents: 'none',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 2: EXTRACT BUILDINGS
// Identity + basic stats for each building
// Thinking: MEDIUM — needs to identify each building carefully
// ════════════════════════════════════════════════════════════

const buildingsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Building name in Hebrew' },
          name_en: { type: Type.STRING, description: 'Building name in English' },
          address: { type: Type.STRING, description: 'Street address' },
          city: { type: Type.STRING, description: 'City in Hebrew' },
          city_en: { type: Type.STRING, description: 'City in English' },
          neighborhood: { type: Type.STRING, description: 'Neighborhood like רמת החייל, הרצליה פיתוח, בורסה' },
          class: { type: Type.STRING },
          year_built: { type: Type.INTEGER },
          leed_rating: { type: Type.STRING },
          total_sqm: { type: Type.INTEGER, description: 'Total building area if mentioned (e.g. "בהיקף כולל של כ-100,000 מ"ר")' },
          floor_count: { type: Type.INTEGER, description: 'If floor 20 is mentioned, this is at LEAST 20' },
          owner_name: { type: Type.STRING, description: 'Building owner/landlord (e.g. "בעל הנכס: אשטרום", "מגדל")' },
          notes: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ['name'],
      },
    },
  },
  required: ['buildings'],
};

const buildingsAgent = new LlmAgent({
  name: 'buildings_extractor',
  model: FLASH,
  instruction: `From the parsed document, extract the identity of EACH building.

## Parsed content:
{parsed_content}

## Classification: {classification}

FOR EACH BUILDING extract:
- name: Hebrew name (e.g. "מגדלי זיו", "אטריום טאוור")
- name_en: English name (e.g. "Migdalei Ziv", "Atrium Tower")
- address: street address
- city: Hebrew city name
- city_en: English city name. Use this mapping:
  הרצליה=Herzliya, תל אביב=Tel Aviv, רמת גן=Ramat Gan, חולון=Holon, פתח תקווה=Petah Tikva, חיפה=Haifa, רעננה=Raanana, הוד השרון=Hod HaSharon, נתניה=Netanya, מודיעין=Modiin, ירושלים=Jerusalem
- neighborhood: sub-area (רמת החייל, הרצליה פיתוח, בורסה, קריית אריה, etc.)
- class: building class if mentioned (A+, A, B, C)
- year_built: ONLY if explicitly stated. Do NOT guess.
- leed_rating: platinum, gold, silver, certified — ONLY if stated
- total_sqm: ONLY the total BUILDING area if stated (e.g. "100,000 מ"ר"). NOT the floor/unit area.
- floor_count: if the document mentions "floor 20", then floor_count >= 20
- owner_name: if "בעל הנכס" or owner is mentioned (e.g. "אשטרום", "מגדל", "אמות")
- confidence: 0.0-1.0

IMPORTANT: A vacancy listing for "760 sqm on the 20th floor" does NOT mean the building is 760 sqm total. The 760 is the UNIT size, not the building.`,
  outputSchema: buildingsSchema,
  outputKey: 'buildings_data',
  includeContents: 'none',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 3: EXTRACT FLOORS + BLOCKS
// Thinking: HIGH — most complex extraction
// ════════════════════════════════════════════════════════════

const floorsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          floors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                floor_number: { type: Type.INTEGER },
                total_sqm: { type: Type.INTEGER },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tenant_name: { type: Type.STRING, description: 'null if vacant' },
                      sqm: { type: Type.INTEGER },
                      status: { type: Type.STRING, description: 'vacant or occupied' },
                      is_sublease: { type: Type.BOOLEAN },
                      sublease_tenant: { type: Type.STRING, description: 'Original leaseholder offering the sublease' },
                      delivery_condition: { type: Type.STRING },
                      available_from: { type: Type.STRING },
                      lease_end: { type: Type.STRING, description: 'ISO date YYYY-MM-DD' },
                    },
                    required: ['sqm', 'status'],
                  },
                },
              },
              required: ['floor_number'],
            },
          },
        },
        required: ['name'],
      },
    },
  },
  required: ['buildings'],
};

const floorsAgent = new LlmAgent({
  name: 'floors_extractor',
  model: FLASH,
  instruction: `From the parsed document, extract floor and unit details for each building.

## Parsed content:
{parsed_content}

## Buildings found: {buildings_data}
## Classification: {classification}

FOR EACH BUILDING, extract every floor/unit mentioned:
- floor_number: the floor number (קומה 11 = 11, "20th Floor" = 20)
- total_sqm: floor/unit area in sqm
- blocks: array of spaces on this floor

FOR EACH BLOCK:
- tenant_name: company name if occupied, null if vacant
- sqm: area in sqm
- status: "vacant" if available for lease, "occupied" if tenant is there
- is_sublease: true if this is a sublease (שכירות משנה). If the whole document is a sublease listing, ALL blocks are subleases.
- sublease_tenant: the ORIGINAL tenant who holds the master lease and is subletting (e.g. if "בעל הנכס: מגדל" and "שכירות משנה" — the sublease_tenant is whoever currently occupies but is offering the sublease)
- delivery_condition: "shell_and_core" (מעטפת), "as_is", "as_is_new" (גמר חדש), "turnkey" (מוכן לכניסה), "furnished" (מרוהט), "furnished_equipped" (מרוהט ומאובזר)
- available_from: ISO date if a specific date is given. null if "זמינות מיידית" (immediate).
- lease_end: when the lease expires. "30/6/28" = "2028-06-30". "יוני 2027" = "2027-06-01".

EXAMPLE: A vacancy listing saying "קומה 11, 1,422 מ"ר, שכירות משנה, מרוהט ומאובזר, זמינות מיידית" =
floor_number: 11, blocks: [{sqm: 1422, status: "vacant", is_sublease: true, delivery_condition: "furnished_equipped", available_from: null}]

If the document says "full-floor layout" or "entire floor" → ONE block with the full floor sqm.`,
  outputSchema: floorsSchema,
  outputKey: 'floors_data',
  includeContents: 'none',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 4: EXTRACT FINANCIALS + CONTACTS + AMENITIES
// Thinking: MEDIUM — careful number parsing
// ════════════════════════════════════════════════════════════

const financialsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          asking_rent_sqm: { type: Type.NUMBER, description: 'NIS per sqm per month' },
          management_fee_sqm: { type: Type.NUMBER, description: 'דמי ניהול in NIS per sqm per month' },
          municipal_tax_sqm: { type: Type.NUMBER },
          allowance: { type: Type.STRING },
          delivery_condition: { type: Type.STRING },
          parking_options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                parking_type: { type: Type.STRING },
                price_monthly: { type: Type.NUMBER },
              },
              required: ['parking_type'],
            },
          },
          distance_train_km: { type: Type.NUMBER },
          distance_light_rail_km: { type: Type.NUMBER },
          contact_name: { type: Type.STRING },
          contact_phone: { type: Type.STRING },
          contact_email: { type: Type.STRING },
          additional_contacts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
              },
            },
          },
          amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['name'],
      },
    },
  },
  required: ['buildings'],
};

const financialsAgent = new LlmAgent({
  name: 'financials_extractor',
  model: FLASH,
  instruction: `From the parsed document, extract financial data, contacts, and amenities for each building.

## Parsed content:
{parsed_content}

## Buildings: {buildings_data}

PRICING — Israeli CRE documents show prices in these patterns:
- "Rent 155 ILS/sqm" or "מחיר למ"ר: 82 ₪" → asking_rent_sqm: 155 or 82
- "Management fee 22 ILS/sqm" or "דמי ניהול למ"ר: 18 ₪" → management_fee_sqm: 22 or 18
- "מחיר לחנייה: 700 ₪" → parking option with price_monthly: 700
- "800 ₪ צפה / 1,000 ₪ שמורה" → TWO parking options: {type: "open", price: 800} and {type: "reserved", price: 1000}
- All prices are NIS per month unless stated otherwise

TRANSIT:
- "adjacent Israel Railways station" or "צמוד לתחנת רכבת" → distance_train_km: 0.1
- "proximity to Red and Green Light Rail" or "קו ירוק של הרכבת הקלה" → distance_light_rail_km: 0.1
- "7 דקות הליכה לתחנת רכבת" (7 min walk to train) → distance_train_km: 0.5

CONTACTS — extract ALL contacts from the document:
- Primary contact → contact_name, contact_phone, contact_email
- Additional contacts → additional_contacts array
- Israeli phone format: +972-XX-XXXXXXX or 05X-XXXXXXX

AMENITIES — map to these exact values:
- gym/fitness/חדר כושר → "gym"
- lobby/לובי → "lobby_lounge"
- restaurant/מסעדה → "restaurant"
- cafe/בית קפה/קפה → "cafe"
- auditorium/אודיטוריום → "conference_center"
- security/24/7/אבטחה → note in building notes, not an amenity
- retail/מסחר → "retail"
- rooftop/גג → "rooftop_terrace"
- EV charging/טעינה חשמלית → "ev_charging"
- showers/מקלחות → "shower_rooms"
- bike/אופניים → "bike_storage"`,
  outputSchema: financialsSchema,
  outputKey: 'financials_data',
  includeContents: 'none',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 5: MERGE all data into final JSON
// Thinking: LOW — just combining, not analyzing
// Has outputSchema to enforce structure
// ════════════════════════════════════════════════════════════

const finalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    document_type: { type: Type.STRING },
    language: { type: Type.STRING },
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          name_en: { type: Type.STRING },
          address: { type: Type.STRING },
          city: { type: Type.STRING },
          city_en: { type: Type.STRING },
          area: { type: Type.STRING },
          class: { type: Type.STRING },
          year_built: { type: Type.INTEGER },
          leed_rating: { type: Type.STRING },
          floor_count: { type: Type.INTEGER },
          typical_floor_sqm: { type: Type.INTEGER },
          total_sqm: { type: Type.INTEGER },
          vacant_sqm: { type: Type.INTEGER },
          occupancy_rate: { type: Type.NUMBER },
          asking_rent_sqm: { type: Type.NUMBER },
          management_fee_sqm: { type: Type.NUMBER },
          municipal_tax_sqm: { type: Type.NUMBER },
          allowance: { type: Type.STRING },
          delivery_condition: { type: Type.STRING },
          parking_options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                parking_type: { type: Type.STRING },
                price_monthly: { type: Type.NUMBER },
              },
            },
          },
          distance_train_km: { type: Type.NUMBER },
          distance_light_rail_km: { type: Type.NUMBER },
          contact_name: { type: Type.STRING },
          contact_phone: { type: Type.STRING },
          contact_email: { type: Type.STRING },
          amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING },
          floors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                floor_number: { type: Type.INTEGER },
                total_sqm: { type: Type.INTEGER },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tenant_name: { type: Type.STRING },
                      sqm: { type: Type.INTEGER },
                      status: { type: Type.STRING },
                      is_sublease: { type: Type.BOOLEAN },
                      sublease_tenant: { type: Type.STRING },
                      delivery_condition: { type: Type.STRING },
                      available_from: { type: Type.STRING },
                      rent_per_sqm: { type: Type.NUMBER },
                      management_fee_sqm: { type: Type.NUMBER },
                      lease_start: { type: Type.STRING },
                      lease_end: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
          _confidence: { type: Type.NUMBER },
        },
        required: ['name'],
      },
    },
  },
  required: ['document_type', 'language', 'buildings'],
};

const mergerAgent = new LlmAgent({
  name: 'merger',
  model: FLASH,
  instruction: `Merge all extracted data into the final result. Match buildings by name.

## Classification: {classification}
## Buildings (identity): {buildings_data}
## Floors & blocks: {floors_data}
## Financials & contacts: {financials_data}

MERGE RULES:
1. For each building name, combine ALL data from all extraction steps into one object.
2. Keep EVERY field from EVERY step. Never drop data.
3. Copy the building-level rent/mgmt_fee down to block-level rent_per_sqm/management_fee_sqm if the block doesn't have its own.
4. Calculate vacant_sqm = sum of sqm for all blocks with status "vacant".
5. Calculate occupancy_rate = (total_sqm - vacant_sqm) / total_sqm if total_sqm > 0.
6. Set _confidence: high (0.8+) if most fields filled, low (<0.5) if sparse.
7. document_type and language come from classification.`,
  outputSchema: finalSchema,
  outputKey: 'extraction_result',
  includeContents: 'none',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  },
});

// ════════════════════════════════════════════════════════════
// PIPELINE
// ════════════════════════════════════════════════════════════

const pipeline = new SequentialAgent({
  name: 'stax_document_pipeline',
  subAgents: [parserAgent, classifierAgent, buildingsAgent, floorsAgent, financialsAgent, mergerAgent],
  description: 'Parse(MED) → Classify(LOW) → Buildings(MED) → Floors(HIGH) → Financials(MED) → Merge(LOW)',
});

export function createRunner() {
  return new InMemoryRunner({
    agent: pipeline,
    appName: 'stax-import',
  });
}

export { pipeline };
