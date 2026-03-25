import { SequentialAgent, LlmAgent, InMemoryRunner } from '@google/adk';
import { Type, Schema, ThinkingLevel } from '@google/genai';

const FLASH = 'gemini-3.1-flash-preview';

// ════════════════════════════════════════════════════════════
// STEP 1: PARSER
// Reads the raw document, outputs clean organized text.
// This is the ONLY agent that sees the actual file.
// ════════════════════════════════════════════════════════════

const parserSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    page_count: { type: Type.STRING },
    document_type: { type: Type.STRING },
    summary: { type: Type.STRING },
    full_text: { type: Type.STRING },
  },
  required: ['page_count', 'document_type', 'summary', 'full_text'],
};

const parserAgent = new LlmAgent({
  name: 'parser',
  model: FLASH,
  instruction: `Read the uploaded document and output ALL of its text content.

This is an Israeli commercial real estate document. It could be a PDF, a photo of a lobby sign, a floor plan, or a newsletter.

OUTPUT:
- page_count: number of pages
- document_type: what it is (vacancy listing, brochure, catalog, lobby sign, floor plan, etc.)
- summary: one paragraph describing the whole document
- full_text: ALL text from every page separated by ---PAGE N---

For photos (lobby signs, building photos): describe what you see as text.
For floor plans: describe the layout in text.

Include EVERY number, price (₪/ILS), area (מ"ר/sqm), date, phone, email, name.
Do NOT output binary or base64 data.`,
  outputSchema: parserSchema,
  outputKey: 'parsed_content',
  includeContents: 'default',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 2: CLASSIFIER
// Counts buildings and identifies key facts.
// Downstream agents use the count as a checklist.
// ════════════════════════════════════════════════════════════

const classifierSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    document_type: { type: Type.STRING, description: 'vacancy_listing, building_brochure, multi_building_catalog, broker_listing, floor_plan, other' },
    language: { type: Type.STRING, description: 'he, en, or mixed' },
    building_count: { type: Type.STRING, description: 'Number of distinct buildings' },
    building_names: { type: Type.STRING, description: 'Comma-separated list of all building names found' },
    is_sublease: { type: Type.STRING, description: 'true or false' },
    data_available: { type: Type.STRING, description: 'What data CAN be extracted: e.g. "building names, addresses, rent prices, floor breakdowns, contact info"' },
    data_missing: { type: Type.STRING, description: 'What data CANNOT be found: e.g. "no total building sqm, no year built, no parking info, no lease dates"' },
    summary: { type: Type.STRING },
  },
  required: ['document_type', 'language', 'building_count', 'building_names', 'data_available', 'data_missing', 'summary'],
};

const classifierAgent = new LlmAgent({
  name: 'classifier',
  model: FLASH,
  instruction: `Analyze the parsed document and prepare a briefing for the extraction agents.

## Parsed content:
{parsed_content}

Your job:
1. Classify the document type
2. Count how many DISTINCT buildings are mentioned
3. List ALL their names (comma-separated)
4. Note if it's a sublease (שכירות משנה)
5. Based on the document type, tell the next agents what to EXPECT and what NOT to expect

Use this knowledge base to set expectations:

**vacancy_listing** (one space for rent):
- data_available: "building name, address, city, one floor with sqm, rent per sqm, management fee, delivery condition, contacts, amenities description"
- data_missing: "no total building sqm (only unit sqm), probably no year built, no full tenant list, no multiple floors"

**building_brochure** (marketing one-pager):
- data_available: "building name, address, city, full specs, LEED rating, amenities, contacts, possibly total sqm and floor count"
- data_missing: "no tenant names, no lease dates, no per-floor breakdown unless marketing specific spaces"

**multi_building_catalog / broker_listing** (newsletter with many buildings):
- data_available: "multiple building names, addresses, per-building available spaces with sqm and floor numbers, rent prices, delivery conditions"
- data_missing: "limited contact info (usually one contact for all), no detailed amenities per building, no lease dates"

**floor_plan** (lobby sign photo or architectural drawing):
- data_available: "building name, tenant names per floor (from sign), floor numbers"
- data_missing: "no sqm data, no rent, no contacts, no financial data, no amenities"

**other**: list what you actually see.

After classifying, SCAN the parsed content and VERIFY your expectations. If you see data you didn't expect (e.g. a vacancy listing that also has total building sqm), add it to data_available.

The next agent will extract ONLY the fields you list in data_available. This briefing is their task definition.`,
  outputSchema: classifierSchema,
  outputKey: 'classification',
  includeContents: 'default',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 3: BUILDINGS — extract ALL data per building
// Knows the count and names from classifier.
// Extracts everything: identity, financials, contacts, amenities.
// ════════════════════════════════════════════════════════════

const buildingsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          name_en: { type: Type.STRING },
          address: { type: Type.STRING },
          city: { type: Type.STRING, description: 'Hebrew city name' },
          city_en: { type: Type.STRING, description: 'English city name' },
          neighborhood: { type: Type.STRING },
          class: { type: Type.STRING },
          year_built: { type: Type.STRING },
          leed_rating: { type: Type.STRING },
          total_sqm: { type: Type.STRING },
          floor_count: { type: Type.STRING },
          asking_rent_sqm: { type: Type.STRING, description: 'NIS per sqm per month' },
          management_fee_sqm: { type: Type.STRING, description: 'דמי ניהול NIS per sqm' },
          municipal_tax_sqm: { type: Type.STRING },
          delivery_condition: { type: Type.STRING, description: 'turnkey, furnished, furnished_equipped, shell_and_core, as_is, as_is_new, as_is_high_level' },
          allowance: { type: Type.STRING },
          parking_info: { type: Type.STRING, description: 'Parking details as text' },
          distance_train: { type: Type.STRING, description: 'Distance to train station' },
          distance_light_rail: { type: Type.STRING, description: 'Distance to light rail' },
          contact_name: { type: Type.STRING },
          contact_phone: { type: Type.STRING },
          contact_email: { type: Type.STRING },
          amenities: { type: Type.STRING, description: 'Comma-separated: gym, lobby_lounge, restaurant, cafe, conference_center, retail, etc.' },
          is_sublease: { type: Type.STRING, description: 'true or false' },
          owner_name: { type: Type.STRING },
          notes: { type: Type.STRING },
          confidence: { type: Type.STRING, description: '0.0 to 1.0' },
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
  instruction: `Extract building data according to the classifier's briefing.

## Parsed content:
{parsed_content}

## Classifier briefing (your task definition):
{classification}

READ THE BRIEFING ABOVE. It tells you:
- How many buildings to find (building_count) — you MUST return exactly that many
- Their names (building_names) — use as your checklist
- What data IS available (data_available) — focus your extraction on THESE fields
- What data is NOT available (data_missing) — do NOT try to extract these, leave them out

The classifier found a specific number of buildings and listed their names. You MUST extract data for EVERY one of them. If the classifier said 10 buildings, you return 10 building objects.

For EACH building, extract everything you can find:
- name (Hebrew), name_en (English)
- address (street), city (Hebrew), city_en (English), neighborhood
- class (A+, A, A/B, B, C)
- year_built (only if stated — as string like "2015")
- leed_rating (platinum, gold, silver, certified — lowercase)
- total_sqm (total BUILDING area, not unit area)
- floor_count (if floor 20 is mentioned → at least "20")
- asking_rent_sqm (NIS per sqm per month)
- management_fee_sqm (דמי ניהול)
- municipal_tax_sqm (ארנונה)
- delivery_condition: turnkey ("fully fitted"/"high-end finishes"), furnished (מרוהט), furnished_equipped (מרוהט ומאובזר), shell_and_core (מעטפת), as_is (מצב קיים), as_is_new (גמר/בגמר)
- parking_info (as text, e.g. "open 800₪, reserved 1000₪")
- distance_train / distance_light_rail (e.g. "adjacent" or "0.5km")
- contact_name, contact_phone, contact_email
- amenities (comma-separated: gym, lobby_lounge, restaurant, cafe, conference_center, retail, rooftop_terrace, ev_charging, shower_rooms, bike_storage)
- is_sublease ("true" if שכירות משנה)
- owner_name (בעל הנכס)
- notes (anything else important)
- confidence ("0.8" if rich data, "0.3" if sparse)

City mapping: רמת גן=Ramat Gan, תל אביב=Tel Aviv, הרצליה=Herzliya, חולון=Holon, פתח תקווה=Petah Tikva, חיפה=Haifa, רעננה=Raanana, הוד השרון=Hod HaSharon, נתניה=Netanya, מודיעין=Modiin, ירושלים=Jerusalem, אור יהודה=Or Yehuda.
"רמת החייל ת"א" → city: "תל אביב", neighborhood: "רמת החייל"
"הרצליה פיתוח" → city: "הרצליה", neighborhood: "הרצליה פיתוח"
"בורסה רמת גן" → city: "רמת גן", neighborhood: "בורסה"

If a field has no data in the document, OMIT it entirely.`,
  outputSchema: buildingsSchema,
  outputKey: 'buildings_data',
  includeContents: 'default',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
  },
});

// ════════════════════════════════════════════════════════════
// STEP 4: FLOORS — extract floor + block details per building
// Knows each building from step 3.
// ════════════════════════════════════════════════════════════

const floorsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Must match a building name from step 3' },
          floors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                floor_number: { type: Type.STRING },
                total_sqm: { type: Type.STRING },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tenant_name: { type: Type.STRING },
                      sqm: { type: Type.STRING },
                      status: { type: Type.STRING, description: 'vacant or occupied' },
                      is_sublease: { type: Type.STRING },
                      delivery_condition: { type: Type.STRING },
                      available_from: { type: Type.STRING },
                      lease_end: { type: Type.STRING },
                      rent_per_sqm: { type: Type.STRING },
                      notes: { type: Type.STRING },
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
  instruction: `Extract floor and unit details for each building found in the previous step.

## Parsed content:
{parsed_content}

## Classifier briefing:
{classification}

## Buildings extracted (your checklist — extract floors for each):
{buildings_data}

The classifier briefing tells you what floor data to expect. The buildings list tells you which buildings to find floors for. Go through each building and extract whatever floor details exist in the parsed content.

For EACH building from the buildings list, find its floor data in the parsed content.

Hebrew floor patterns:
- "• קומה N: XXX מ״ר" or "קומה N: כ-XXX מ״ר"
- "קומת קרקע" = floor 0 (ground floor)
- Multiple bullet points (•) under a building = multiple available spaces
- "full-floor layout" / "entire floor" = ONE block with full floor sqm

For each floor, extract blocks (spaces/units):
- tenant_name: company name if occupied, omit if vacant
- sqm: area as string (e.g. "760")
- status: "vacant" if available for lease, "occupied" if tenant is there
- is_sublease: "true" if שכירות משנה
- delivery_condition: turnkey, furnished, furnished_equipped, shell_and_core, as_is, as_is_new
- available_from: ISO date, or omit for immediate (אכלוס מיידי / זמינות מיידית)
- lease_end: ISO date (e.g. "30/6/28" → "2028-06-30", "יוני 2027" → "2027-06-01")
- rent_per_sqm: if per-unit rent differs from building-level

In catalogs/newsletters: ALL listed spaces are VACANT (they're marketing available spaces).

For lobby sign photos: each company name on a floor = one block, status "occupied", sqm "0" (unknown).
"משרד להשכרה" on a sign = one block, status "vacant", sqm "0".

If a building has no floor data in the document, return it with an empty floors array.`,
  outputSchema: floorsSchema,
  outputKey: 'floors_data',
  includeContents: 'default',
  generateContentConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
  },
});

// ════════════════════════════════════════════════════════════
// PIPELINE: 4 agents, server-side merge
// ════════════════════════════════════════════════════════════

const pipeline = new SequentialAgent({
  name: 'stax_document_pipeline',
  subAgents: [parserAgent, classifierAgent, buildingsAgent, floorsAgent],
  description: 'Parse(MED) → Classify(LOW) → Buildings(MED) → Floors(HIGH). Server merges.',
});

export function createRunner() {
  return new InMemoryRunner({
    agent: pipeline,
    appName: 'stax-import',
  });
}

export { pipeline };
