import { SequentialAgent, LlmAgent, InMemoryRunner } from '@google/adk';
import { ThinkingLevel } from '@google/genai';
import {
  classificationSchema,
  extractionResultSchema,
  validationResultSchema,
} from './schemas';

// ────────────────────────────────────────────────────────────
// Step 1: CLASSIFY (Flash — fast, cheap)
// Quickly identify what the document is and how many buildings
// ────────────────────────────────────────────────────────────

const CLASSIFY_PROMPT = `You are a document classifier for Israeli commercial real estate.

Analyze the uploaded document and determine:
1. **document_type**: Classify into one of these categories:
   - building_brochure: Single building marketing sheet
   - vacancy_listing: Specific vacant space offering (may be sublease)
   - multi_building_catalog: Newsletter/catalog with many buildings (e.g. "מידעון" from Amot, SGS)
   - broker_listing: Broker's multi-building inventory (e.g. "דיוור מתווכים" from Sela)
   - lease_agreement: Actual lease contract
   - fee_agreement_tenant / fee_agreement_landlord: Commission agreements
   - floor_plan: Architectural floor plan image
   - other: Anything else
2. **language**: "he" (Hebrew), "en" (English), or "mixed"
3. **building_count**: How many distinct buildings are mentioned
4. **summary**: One-line description of the document content

Be fast and accurate. This is a classification step, not extraction.`;

const classifierAgent = new LlmAgent({
  name: 'classifier',
  model: 'gemini-3.1-flash-lite-preview',
  instruction: CLASSIFY_PROMPT,
  outputSchema: classificationSchema,
  outputKey: 'classification',
  includeContents: 'default',
});

// ────────────────────────────────────────────────────────────
// Step 2: EXTRACT (Pro 3.1 — deep thinking, MEDIUM level)
// Heavy lifting: read every page, extract all structured data
// ────────────────────────────────────────────────────────────

const EXTRACT_PROMPT = `You are an expert commercial real estate data extractor for the Israeli market.
You work for a brokerage firm. The data you extract will go directly into the company's portfolio database — brokers will use it to find spaces for clients, track vacancies, and close deals. Accuracy is critical.

## Context from classification:
{classification}

## Your task:
Extract ALL structured building data from this document. The classification told you how many buildings to expect — make sure you find them all. If the document has a table of contents or index, use it as a checklist.

## City extraction (IMPORTANT):
- Always extract the city name in Hebrew as \`city\` (e.g., "תל אביב", "רמת גן", "הרצליה")
- Always extract the English city name as \`city_en\` (e.g., "Tel Aviv", "Ramat Gan", "Herzliya")
- Parse city from the address if not stated separately
- Common Israeli city names: הרצליה=Herzliya, תל אביב=Tel Aviv, רמת גן=Ramat Gan, חולון=Holon, פתח תקווה=Petah Tikva, חיפה=Haifa, ירושלים=Jerusalem, רעננה=Raanana, הוד השרון=Hod HaSharon, נתניה=Netanya, מודיעין=Modiin, ראשון לציון=Rishon LeZion, אשדוד=Ashdod, באר שבע=Beer Sheva, כפר סבא=Kfar Saba, בני ברק=Bnei Brak, אזור=Azor, אור יהודה=Or Yehuda, יבנה=Yavne, נוף הגליל=Nof HaGalil, רחובות=Rehovot, קריית אריה=Kiryat Arie

## Hebrew handling:
- Hebrew names → \`name\`, transliterated/English → \`name_en\`
- "מ"ר" / "מ״ר" = sqm
- "₪" / "ש״ח" = NIS (Israeli Shekels)
- Rent is per sqm per month unless stated otherwise
- "דמי ניהול" = management fee per sqm per month
- "ארנונה" = municipal tax

## Dates:
Normalize to ISO YYYY-MM-DD. Hebrew months: ינואר=01, פברואר=02, מרץ=03, אפריל=04, מאי=05, יוני=06, יולי=07, אוגוסט=08, ספטמבר=09, אוקטובר=10, נובמבר=11, דצמבר=12

## Sublease:
"שכירות משנה" / "שוכר משנה" / "sub-let" → set \`is_sublease: true\`, note original tenant in \`sublease_tenant\`

## Availability:
"אכלוס מיידי" = immediate (omit available_from). Specific dates → set the date.

## Delivery condition:
- "מעטפת" / "shell & core" → shell_and_core
- "כניסה מיידית" / "as-is" → as_is
- "גמר חדש" → as_is_new
- "גמר גבוה" → as_is_high_level
- "מוכן לכניסה" / "turnkey" → turnkey
- "מרוהט" → furnished
- "מרוהט ומאובזר" → furnished_equipped
- "דורש שיפוץ" → renovation_required

## Area/Region:
"צפון" → north, "מרכז" → center, "דרום" → south

## Building class: A+, A, A/B, B, or C

## Parking:
"800 ₪ צפה / 1,000 ₪ שמורה" → [{type:"open",price_monthly:800},{type:"reserved",price_monthly:1000}]

## Sqm calculation:
- If the document lists individual floor/unit areas but NOT total building sqm, CALCULATE total_sqm by summing all floor areas
- If vacant sqm is not stated, calculate it from vacant blocks
- If occupancy_rate is not stated, calculate it: (total_sqm - vacant_sqm) / total_sqm

## Confidence:
0.0-1.0 per building. High (0.8+) when data is clearly stated in the document. Low (<0.5) when you're inferring from partial data.

## CRITICAL RULES:
- If a field is NOT in the document, OMIT it. Do NOT guess or hallucinate.
- When floors/tenants are listed, create floor + block entries. When only building stats, set building-level fields only.
- For broker listings with per-floor tables: extract EACH available space as a separate block.
- Contact person: extract name, phone, email if listed per building.

Think carefully through every page. Cross-reference the table of contents if one exists. This data goes directly into the brokers' live database.`;

const extractorAgent = new LlmAgent({
  name: 'extractor',
  model: 'gemini-3.1-pro-preview',
  instruction: EXTRACT_PROMPT,
  outputSchema: extractionResultSchema,
  outputKey: 'extraction_result',
  includeContents: 'default',
  generateContentConfig: {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.MEDIUM,
    },
  },
});

// ────────────────────────────────────────────────────────────
// Step 3: VALIDATE (Flash — fast, cheap)
// Quick sanity check on the extraction output
// ────────────────────────────────────────────────────────────

const VALIDATE_PROMPT = `You are a data quality validator for a commercial real estate brokerage database.

## Classification context:
{classification}

## Extracted data to validate:
{extraction_result}

## Validation rules:

### Completeness:
1. The classification said there are N buildings — verify the extraction has N buildings. If buildings are missing, flag it.
2. Every building MUST have: name, city, city_en. Flag if missing.
3. Buildings should have total_sqm > 0. If 0, check if it can be calculated from floor data.

### Data quality:
4. Building names should not be generic city names (e.g., "אור יהודה" is a city, not a building name — the building has a different name)
5. sqm values: 10-200,000 sqm per building, 10-20,000 per floor
6. Rent: 20-500 NIS/sqm/month for Israel
7. Dates: valid ISO format, range 2020-2040
8. Floor numbers: -5 to 120
9. occupancy_rate: 0.0 to 1.0
10. No duplicate buildings (same name + same address)

### City validation:
11. city must be a Hebrew city name, city_en must be the English equivalent
12. city_en must NOT be "Herzliya" unless city is actually "הרצליה"

### Corrections:
If you find issues, provide corrected_buildings with the fixes applied. Common fixes:
- Calculate total_sqm from sum of floor areas
- Fix city_en to match city
- Remove buildings with no useful data (no sqm, no floors, no rent — just a name)
8. If sublease detected, verify sublease_tenant is set
9. If data looks correct, set is_valid: true and return empty issues
10. If issues found, describe them and optionally provide corrected_buildings

Be concise. Flag real problems, not style preferences.`;

const validatorAgent = new LlmAgent({
  name: 'validator',
  model: 'gemini-3.1-flash-lite-preview',
  instruction: VALIDATE_PROMPT,
  outputSchema: validationResultSchema,
  outputKey: 'validation_result',
  includeContents: 'none',  // stateless — just uses state vars
});

// ────────────────────────────────────────────────────────────
// Sequential Pipeline: Classify → Extract → Validate
// ────────────────────────────────────────────────────────────

const pipeline = new SequentialAgent({
  name: 'stax_document_pipeline',
  subAgents: [classifierAgent, extractorAgent, validatorAgent],
  description: 'Three-step document processing: classify (Flash) → extract (Pro 3.1 + thinking) → validate (Flash)',
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

export { pipeline, classifierAgent, extractorAgent, validatorAgent };
