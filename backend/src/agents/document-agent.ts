import { SequentialAgent, LlmAgent, InMemoryRunner } from '@google/adk';
import { Type, Schema } from '@google/genai';

// ────────────────────────────────────────────────────────────
// Model config — all Flash for speed + cost
// ────────────────────────────────────────────────────────────

const FLASH = 'gemini-3.1-flash-lite-preview';

// ────────────────────────────────────────────────────────────
// Step 1: CLASSIFY
// What type of document? How many buildings? What language?
// ────────────────────────────────────────────────────────────

const classifySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    document_type: { type: Type.STRING, description: 'One of: vacancy_listing, building_brochure, multi_building_catalog, broker_listing, lease_agreement, floor_plan, other' },
    language: { type: Type.STRING, description: 'he, en, or mixed' },
    building_count: { type: Type.INTEGER, description: 'Number of distinct buildings mentioned' },
    summary: { type: Type.STRING, description: 'One-line summary of document content' },
  },
  required: ['document_type', 'language', 'building_count', 'summary'],
};

const classifierAgent = new LlmAgent({
  name: 'classifier',
  model: FLASH,
  instruction: `You classify Israeli commercial real estate documents.
Determine: document_type, language (he/en/mixed), building_count, and a one-line summary.
Document types: vacancy_listing (one space for rent), building_brochure (one building spec sheet), multi_building_catalog (newsletter with many buildings), broker_listing (broker inventory list), lease_agreement, floor_plan, other.
Be fast and precise.`,
  outputSchema: classifySchema,
  outputKey: 'classification',
});

// ────────────────────────────────────────────────────────────
// Step 2: EXTRACT BUILDINGS
// For each building: name, address, city, class, basic stats
// ────────────────────────────────────────────────────────────

const buildingsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Hebrew building name' },
          name_en: { type: Type.STRING, description: 'English building name' },
          address: { type: Type.STRING, description: 'Full street address' },
          city: { type: Type.STRING, description: 'City in Hebrew (e.g. תל אביב, רמת גן, הרצליה)' },
          city_en: { type: Type.STRING, description: 'City in English (e.g. Tel Aviv, Ramat Gan, Herzliya)' },
          class: { type: Type.STRING, description: 'A+, A, A/B, B, or C' },
          year_built: { type: Type.INTEGER, description: 'Year built if mentioned' },
          leed_rating: { type: Type.STRING, description: 'platinum, gold, silver, certified, or none' },
          total_sqm: { type: Type.INTEGER, description: 'Total building area in sqm' },
          floor_count: { type: Type.INTEGER, description: 'Number of floors' },
          notes: { type: Type.STRING, description: 'Any important notes about the building' },
          confidence: { type: Type.NUMBER, description: '0.0-1.0 confidence score' },
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
  instruction: `You extract building identity data from Israeli commercial real estate documents.

## Context: {classification}

For EACH building in the document, extract: name (Hebrew), name_en (English), address, city (Hebrew), city_en (English), class, year_built, leed_rating, total_sqm, floor_count, notes.

City mapping: הרצליה=Herzliya, תל אביב=Tel Aviv, רמת גן=Ramat Gan, חולון=Holon, פתח תקווה=Petah Tikva, חיפה=Haifa, רעננה=Raanana, הוד השרון=Hod HaSharon, נתניה=Netanya, מודיעין=Modiin, ירושלים=Jerusalem, בני ברק=Bnei Brak, אזור=Azor, אור יהודה=Or Yehuda, יבנה=Yavne, נוף הגליל=Nof HaGalil.

ONLY include data explicitly stated in the document. Do NOT guess numbers. If floor 20 is mentioned, floor_count is at least 20.`,
  outputSchema: buildingsSchema,
  outputKey: 'buildings_data',
});

// ────────────────────────────────────────────────────────────
// Step 3: EXTRACT FLOORS + BLOCKS
// Per building: which floors, which tenants, sqm per block
// ────────────────────────────────────────────────────────────

const floorsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Building name (must match step 2)' },
          floors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                floor_number: { type: Type.INTEGER },
                total_sqm: { type: Type.INTEGER, description: 'Floor area in sqm' },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tenant_name: { type: Type.STRING, description: 'Tenant company name or null if vacant' },
                      sqm: { type: Type.INTEGER },
                      status: { type: Type.STRING, description: 'vacant or occupied' },
                      is_sublease: { type: Type.BOOLEAN, description: 'true if שכירות משנה / sublease' },
                      sublease_tenant: { type: Type.STRING, description: 'Original tenant if sublease' },
                      delivery_condition: { type: Type.STRING, description: 'shell_and_core, as_is, as_is_new, turnkey, furnished, furnished_equipped' },
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
  instruction: `You extract floor and tenant block data from Israeli CRE documents.

## Classification: {classification}
## Buildings found: {buildings_data}

For each building, extract every floor mentioned with its blocks (tenants or vacant spaces).
- "שכירות משנה" / "sub-let" = sublease, set is_sublease: true
- "אכלוס מיידי" = immediate availability
- "מעטפת" = shell_and_core, "מרוהט" = furnished, "מרוהט ומאובזר" = furnished_equipped, "גמר" = as_is_new, "turnkey" = turnkey
- If a floor is described as a "full-floor layout" or "entire floor", create ONE block with the full floor sqm

ONLY include floors explicitly mentioned in the document.`,
  outputSchema: floorsSchema,
  outputKey: 'floors_data',
});

// ────────────────────────────────────────────────────────────
// Step 4: EXTRACT FINANCIAL + CONTACT + AMENITIES
// Rent, mgmt fee, parking, contacts, amenities per building
// ────────────────────────────────────────────────────────────

const financialsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Building name (must match previous steps)' },
          asking_rent_sqm: { type: Type.NUMBER, description: 'Asking rent in NIS per sqm per month' },
          management_fee_sqm: { type: Type.NUMBER, description: 'Management fee (דמי ניהול) in NIS per sqm per month' },
          municipal_tax_sqm: { type: Type.NUMBER, description: 'Municipal tax (ארנונה) in NIS per sqm' },
          allowance: { type: Type.STRING, description: 'Tenant improvement allowance' },
          delivery_condition: { type: Type.STRING, description: 'shell_and_core, as_is, as_is_new, turnkey, furnished, furnished_equipped' },
          parking_options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                parking_type: { type: Type.STRING, description: 'open (צפה), reserved (שמורה), or underground' },
                price_monthly: { type: Type.NUMBER, description: 'NIS per space per month' },
              },
              required: ['parking_type'],
            },
          },
          distance_train_km: { type: Type.NUMBER, description: 'Distance to nearest train station in km' },
          distance_light_rail_km: { type: Type.NUMBER, description: 'Distance to light rail in km' },
          contact_name: { type: Type.STRING },
          contact_phone: { type: Type.STRING },
          contact_email: { type: Type.STRING },
          amenities: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: 'One of: restaurant, cafe, gym, retail, lobby_lounge, conference_center, daycare, synagogue, shower_rooms, bike_storage, rooftop_terrace, ev_charging' },
          },
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
  instruction: `You extract financial data, contacts, and amenities from Israeli CRE documents.

## Classification: {classification}
## Buildings: {buildings_data}

For each building extract: asking_rent_sqm (NIS/sqm/month), management_fee_sqm (דמי ניהול), municipal_tax_sqm (ארנונה), parking_options, transit distances, contact info, amenities.

Hebrew terms:
- "₪" / "ש״ח" = NIS. Rent is per sqm per month unless stated otherwise.
- "דמי ניהול" = management fee. "ארנונה" = municipal tax.
- "צפה" = open parking. "שמורה" / "קבועה" = reserved parking.
- "800 ₪ צפה / 1,000 ₪ שמורה" → two parking options.
- "Adjacent to train" or "near station" = distance_train_km: 0.1

ONLY include data explicitly stated. Do NOT invent numbers.`,
  outputSchema: financialsSchema,
  outputKey: 'financials_data',
});

// ────────────────────────────────────────────────────────────
// Step 5: MERGE everything into final JSON
// Combine buildings + floors + financials into one result
// ────────────────────────────────────────────────────────────

const mergerAgent = new LlmAgent({
  name: 'merger',
  model: FLASH,
  instruction: `You merge extracted CRE data into a final JSON result.

## Classification: {classification}
## Buildings (identity): {buildings_data}
## Floors & blocks: {floors_data}
## Financials & contacts: {financials_data}

Merge all data for each building into ONE complete object. Match by building name.
Output a JSON object with:
- "document_type": from classification
- "language": from classification
- "buildings": array of merged building objects

Each merged building should have ALL fields from all three extraction steps combined.
Add "_confidence" (0.0-1.0) based on how much data was successfully extracted.

Rules:
- If buildings_data has "Atrium Tower" with city "Ramat Gan" and financials_data has "Atrium Tower" with rent 155, merge them.
- Keep ALL fields from ALL steps. Do not drop any data.
- Dates must be ISO format YYYY-MM-DD.
- Do NOT invent data that wasn't in any extraction step.

Return ONLY valid JSON, no markdown, no code blocks.`,
  outputKey: 'extraction_result',
  includeContents: 'none',
});

// ────────────────────────────────────────────────────────────
// Sequential Pipeline: 5 Flash agents
// ────────────────────────────────────────────────────────────

const pipeline = new SequentialAgent({
  name: 'stax_document_pipeline',
  subAgents: [classifierAgent, buildingsAgent, floorsAgent, financialsAgent, mergerAgent],
  description: '5-step Flash pipeline: classify → buildings → floors → financials → merge',
});

// ────────────────────────────────────────────────────────────
// Runner factory
// ────────────────────────────────────────────────────────────

export function createRunner() {
  return new InMemoryRunner({
    agent: pipeline,
    appName: 'stax-import',
  });
}

export { pipeline };
