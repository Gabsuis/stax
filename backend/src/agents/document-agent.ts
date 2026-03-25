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
    page_count: { type: Type.INTEGER, description: 'Number of pages' },
    document_type: { type: Type.STRING, description: 'What kind of document: vacancy listing, brochure, catalog, lobby sign photo, floor plan, etc.' },
    summary: { type: Type.STRING, description: 'One paragraph summary of the entire document' },
    full_text: { type: Type.STRING, description: 'ALL text from every page. Separate pages with ---PAGE N---. Include every number, name, address, price, date, phone, email. For images: describe what you see in [IMAGE: description] tags.' },
  },
  required: ['page_count', 'document_type', 'summary', 'full_text'],
};

const parserAgent = new LlmAgent({
  name: 'parser',
  model: FLASH,
  instruction: `Read the uploaded document and output ALL of its text content.

You are reading a commercial real estate document from Israel. It could be:
- A PDF with text about buildings, offices, pricing
- A photo of a building lobby directory sign showing tenants per floor
- A floor plan image
- A multi-page catalog or newsletter

YOUR OUTPUT must contain:
1. document_type: what kind of document this is
2. summary: one paragraph describing the document
3. page_count: number of pages
4. full_text: ALL text from every page, organized as:

---PAGE 1---
[all text from page 1, preserving structure]

---PAGE 2---
[all text from page 2]

For PHOTOS of lobby signs, describe each floor:
Floor 4: Company A, Company B
Floor 3: Company C
Floor 2: Company D, Company E (משרד להשכרה = for rent)
Floor 1: Company F

For IMAGES (floor plans, building photos), describe them:
[IMAGE: Floor plan showing open office layout, approximately 760 sqm, with meeting rooms on the west side]

CRITICAL: Include EVERY number, price (₪), area (מ"ר/sqm), date, phone number, email, and name you see. Do NOT output base64 data or binary content. Output only human-readable text.`,
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
- document_type: "vacancy_listing" (one space for rent/sublease), "building_brochure" (one building marketing), "multi_building_catalog" (newsletter with many buildings like "מידעון"), "broker_listing" (broker inventory like "דיוור מתווכים"), "lease_agreement", "floor_plan" (architectural drawing OR lobby directory sign photo showing tenants per floor), "building_photo" (exterior/interior photo), "other"
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
  instruction: `Extract building identity from the parsed document.

## Parsed content:
{parsed_content}

## Classification: {classification}

BEHAVIOR DEPENDS ON DOCUMENT TYPE (from classification):

**If floor_plan (lobby directory sign photo):**
- Expect ONE building. Name is at the top of the sign (e.g. "גלגלי הפלדה 11", "בית REIT 1 הרצליה").
- Address may not be available. City may be guessable from the name.
- No sqm data, no class, no year — just the building name and whatever is on the sign.
- "כניסה א/ב" = entrances of the SAME building, not separate buildings.

**If vacancy_listing:**
- Expect ONE building. Name is usually prominent at the top.
- total_sqm: do NOT confuse the unit size with total building size. "760 sqm on floor 20" ≠ 760 sqm building.
- If the document says "בהיקף כולל של כ-100,000 מ"ר" — THAT is total_sqm.
- floor_count: if floor 20 is mentioned → floor_count is at least 20.

**If building_brochure:**
- Expect ONE building with detailed specs.
- total_sqm, class, year_built, leed_rating should all be present.

**If multi_building_catalog or broker_listing:**
- Expect MANY buildings. Scan every page.
- Each building may have different amounts of data.

FOR EACH BUILDING extract: name, name_en, address, city, city_en, neighborhood, class, year_built, leed_rating, total_sqm, floor_count, owner_name, confidence.

City mapping: הרצליה=Herzliya, תל אביב=Tel Aviv, רמת גן=Ramat Gan, חולון=Holon, פתח תקווה=Petah Tikva, חיפה=Haifa, רעננה=Raanana, הוד השרון=Hod HaSharon, נתניה=Netanya, מודיעין=Modiin, ירושלים=Jerusalem, בני ברק=Bnei Brak, אזור=Azor, אור יהודה=Or Yehuda, יבנה=Yavne, נוף הגליל=Nof HaGalil, רחובות=Rehovot.

ONLY include data explicitly in the document. Do NOT invent numbers.`,
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
  instruction: `Extract floor and unit details from the parsed document.

## Parsed content:
{parsed_content}

## Buildings found: {buildings_data}
## Classification: {classification}

BEHAVIOR BY DOCUMENT TYPE:

**If floor_plan (lobby directory sign):**
- Each ROW on the sign = one floor. Number on the side = floor number.
- Each company name/logo = one block, status "occupied", sqm: 0 (unknown from sign).
- "משרד להשכרה" = one block, status "vacant", sqm: 0.
- Do NOT invent sqm. Set 0 for all blocks from lobby signs.
- Company on multiple floors → block on EACH floor.

**If vacancy_listing:**
- Usually ONE floor, ONE block (the space offered).
- "full-floor layout" / "entire floor" → ONE block with full floor sqm.
- If document is sublease (שכירות משנה) → is_sublease: true on ALL blocks.

**If multi_building_catalog / broker_listing:**
- Per-building floor details, possibly in tables.
- Extract each building's floors separately.

FIELDS:
- floor_number: קומה 11 = 11, "20th Floor" = 20
- sqm: area (0 if unknown)
- status: "vacant" or "occupied"
- is_sublease: true if שכירות משנה
- sublease_tenant: original tenant subletting
- delivery_condition: shell_and_core (מעטפת), as_is, as_is_new (גמר חדש), turnkey, furnished (מרוהט), furnished_equipped (מרוהט ומאובזר)
- available_from: ISO date or null for immediate
- lease_end: "30/6/28" → "2028-06-30", "יוני 2027" → "2027-06-01"

EXAMPLE: "קומה 11, 1,422 מ"ר, שכירות משנה, מרוהט ומאובזר" →
floor: 11, blocks: [{sqm: 1422, status: "vacant", is_sublease: true, delivery_condition: "furnished_equipped"}]`,
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
  instruction: `Extract financial data, contacts, and amenities from the parsed document.

## Parsed content:
{parsed_content}

## Buildings: {buildings_data}
## Classification: {classification}

BEHAVIOR BY DOCUMENT TYPE:

**If floor_plan (lobby directory sign):**
- Financial data: NONE expected. Maybe a phone number if "להשכרה" appears.
- Contacts: only if a phone number is visible on the sign (e.g. 058-4449948 next to "להשכרה").
- Amenities: NONE from a lobby sign.
- Do NOT invent financial data for lobby signs.

**If vacancy_listing:**
- This is the RICHEST source for financial data. Look carefully for:
  - Rent: in title or near "מחיר למ"ר" / "Rent X ILS/sqm"
  - Management fee: near "דמי ניהול"
  - Parking: near "חנייה" or "מחיר לחנייה"
- Contacts are usually at the bottom (broker presenting the listing).
- Amenities are mentioned in the building description.

**If multi_building_catalog / broker_listing:**
- Financial data per building. May be in tables.
- Usually one or two contacts for the whole catalog.
- Amenities vary per building.

PRICING PATTERNS:
- "Rent 155 ILS/sqm" or "מחיר למ"ר: 82 ₪" → asking_rent_sqm
- "Management fee 22 ILS/sqm" or "דמי ניהול למ"ר: 18 ₪" → management_fee_sqm
- "מחיר לחנייה: 700 ₪" → parking {type: "open", price_monthly: 700}
- "800 ₪ צפה / 1,000 ₪ שמורה" → TWO options: open 800 + reserved 1000
- All prices NIS per month unless stated otherwise

TRANSIT:
- "adjacent to train" / "צמוד לתחנת רכבת" → distance_train_km: 0.1
- "proximity to Light Rail" / "רכבת קלה" → distance_light_rail_km: 0.1
- "7 min walk to train" / "7 דקות הליכה" → distance_train_km: 0.5

CONTACTS (Israeli format):
- Phone: +972-XX-XXXXXXX or 05X-XXXXXXX
- Primary → contact_name/phone/email. Others → additional_contacts.

AMENITIES (use ONLY these values):
gym, lobby_lounge, restaurant, cafe, conference_center, retail, rooftop_terrace, ev_charging, shower_rooms, bike_storage, daycare, synagogue`,
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
