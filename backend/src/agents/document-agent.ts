import { GoogleGenAI } from '@google/genai';
import { SequentialAgent, LlmAgent, InMemoryRunner } from '@google/adk';
import { Type, Schema, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({});
const PRO = 'gemini-3.1-pro-preview';
const FLASH = 'gemini-3.1-flash-lite-preview';

// ════════════════════════════════════════════════════════════
// ROUTER: Flash Lite — lobby_sign or vacancy_listing?
// ════════════════════════════════════════════════════════════

export async function routeDocument(base64: string, mimeType: string): Promise<'lobby_sign' | 'vacancy_listing' | 'unknown'> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-preview',  // router
    contents: [{
      role: 'user',
      parts: [
        { text: 'What is this? Reply with EXACTLY one word:\n- lobby_sign (photo of building lobby directory showing tenants per floor)\n- vacancy_listing (document/PDF listing office spaces for rent with prices)\n- unknown (anything else)' },
        { inlineData: { data: base64, mimeType } },
      ],
    }],
  });
  const text = response.text?.trim().toLowerCase() || '';
  if (text.includes('lobby_sign')) return 'lobby_sign';
  if (text.includes('vacancy_listing')) return 'vacancy_listing';
  return 'unknown';
}

// ════════════════════════════════════════════════════════════
// PATH 1: LOBBY SIGN — Single Gemini call
// ════════════════════════════════════════════════════════════

export interface FloorData {
  floor_number: string
  tenants: string[]
  has_vacancy: boolean
}

export interface LobbySignBuilding {
  building_name: string
  building_name_en: string
  address: string
  city: string
  city_en: string
  entrance: string
  floor_count: number
  floors: FloorData[]
}

export type LobbySignResult = LobbySignBuilding[];

export async function extractLobbySign(base64: string, mimeType: string): Promise<LobbySignResult> {
  const response = await ai.models.generateContent({
    model: PRO,
    contents: [{
      role: 'user',
      parts: [
        { text: `You are reading a photo of an Israeli building lobby directory sign. Your job is to list EVERY tenant on EVERY floor. Be meticulous.

INSTRUCTIONS:
1. Start at the TOP of the sign and work DOWN
2. The building name is usually at the very top (e.g. "גלגלי הפלדה 11"). It might be MISSING — that's OK, leave building_name empty.
3. The address might appear below the building name. It might be MISSING — that's OK, leave address empty.
4. Each horizontal row = one floor. The big number on the right/left = floor number
5. On each floor row, read EVERY company name and logo from LEFT to RIGHT
6. Include Hebrew names, English names, and mixed names exactly as written
7. If you see "משרד להשכרה" or "להשכרה" with a phone number, that floor has a vacancy — set has_vacancy: true AND include "להשכרה [phone]" as a tenant entry
8. "קומת קרקע" = floor "0" (ground floor)
9. Order floors from HIGHEST number to LOWEST in the output
10. floor_count = THE HIGHEST FLOOR NUMBER (not the count of floors with data). If floor 20 is shown, floor_count is at least 20.

MULTI-BUILDING SIGNS:
Some signs show MULTIPLE buildings or sections (e.g. "← A" and "← B", or "בניין A" and "בניין B", or "כניסה א" and "כניסה ב" with DIFFERENT floor numbers/tenants).
- If the sign clearly shows separate sections with different floors, return MULTIPLE building objects
- Each section gets its own building with its own floors
- Use the section label as the entrance field (e.g. "A", "B", "כניסה א")
- The building_name is the SAME for all sections (it's one physical building with multiple entrances)

IMPORTANT:
- Do NOT guess the city. Leave city and city_en EMPTY unless the city name is literally written on the sign.
- Do NOT hallucinate data that is not visible in the image.

Return a JSON ARRAY of buildings:
[
  {
    "building_name": "Hebrew name or empty string if not visible",
    "building_name_en": "English name or empty string",
    "address": "street address if visible, or empty string",
    "city": "",
    "city_en": "",
    "entrance": "A, B, כניסה א, etc. or empty string",
    "floor_count": highest floor number seen,
    "floors": [
      { "floor_number": "4", "tenants": ["Company A", "Company B"], "has_vacancy": false },
      { "floor_number": "3", "tenants": ["Company C"], "has_vacancy": false }
    ]
  }
]

If there's only ONE building/section, return an array with ONE object.

CRITICAL: Do NOT skip any tenant. Read every logo, every text, every name on each floor row. If unsure about a name, include your best reading.

Return ONLY a valid JSON array.` },
        { inlineData: { data: base64, mimeType } },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'HIGH' as unknown as undefined },
    },
  });

  const raw = JSON.parse(response.text || '[]');
  // Handle both array and single object responses
  const buildings: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];

  return buildings.map((parsed) => ({
    building_name: (parsed.building_name as string) || '',
    building_name_en: (parsed.building_name_en as string) || '',
    address: (parsed.address as string) || '',
    city: (parsed.city as string) || '',
    city_en: (parsed.city_en as string) || '',
    entrance: (parsed.entrance as string) || '',
    floor_count: (parsed.floor_count as number) || (parsed.floors as unknown[])?.length || 0,
    floors: ((parsed.floors as Record<string, unknown>[]) || []).map((f) => ({
      floor_number: String(f.floor_number ?? ''),
      tenants: Array.isArray(f.tenants) ? f.tenants.map(String) : [],
      has_vacancy: f.has_vacancy === true,
    })),
  }));
}

// ════════════════════════════════════════════════════════════
// VERIFIER: Flash — dedup tenants, fix edge cases, fill gaps
// ════════════════════════════════════════════════════════════

export async function verifyLobbySign(buildings: LobbySignResult): Promise<LobbySignResult> {
  const response = await ai.models.generateContent({
    model: FLASH,
    contents: [{
      role: 'user',
      parts: [{ text: `You are a quality checker for building lobby sign extraction. Fix errors in this JSON.

INPUT:
${JSON.stringify(buildings, null, 2)}

CHECK AND FIX THESE ISSUES:

1. DUPLICATE TENANTS PER FLOOR:
   The same company often appears twice — once in Hebrew, once in English (e.g. "אדג'קונקס" and "edgeconnex").
   If two tenant names on the SAME floor clearly refer to the same company (one Hebrew, one English, or very similar spellings), MERGE them into ONE entry. Keep the English name if available, or the more readable one.

2. ODD/EVEN FLOOR PANELS = ONE BUILDING:
   Sometimes a sign has two panels side by side. One shows odd floors (1, 3, 5) and the other shows even floors (2, 4, 6). The extraction might return them as TWO separate buildings.
   CLUE: If you see two "buildings" with the SAME name (or no name) where one has only odd floors and the other has only even floors, they are ONE building. MERGE them into a single building with all floors combined.
   CLUE: If the floor numbers between two "buildings" don't overlap at all and together form a near-continuous sequence, they are likely ONE building.

3. FLOOR COUNT:
   floor_count must equal the HIGHEST floor number, not the count of listed floors. If floor 8 exists, floor_count is at least 8.

Return the CORRECTED JSON array. Same structure, just fixed. If nothing needs fixing, return the input unchanged.
Return ONLY valid JSON.` }],
    }],
    config: {
      responseMimeType: 'application/json',
    },
  });

  try {
    const fixed = JSON.parse(response.text || '[]');
    const arr: Record<string, unknown>[] = Array.isArray(fixed) ? fixed : [fixed];
    return arr.map((b) => ({
      building_name: (b.building_name as string) || '',
      building_name_en: (b.building_name_en as string) || '',
      address: (b.address as string) || '',
      city: (b.city as string) || '',
      city_en: (b.city_en as string) || '',
      entrance: (b.entrance as string) || '',
      floor_count: (b.floor_count as number) || 0,
      floors: ((b.floors as Record<string, unknown>[]) || []).map((f) => ({
        floor_number: String(f.floor_number ?? ''),
        tenants: Array.isArray(f.tenants) ? f.tenants.map(String) : [],
        has_vacancy: f.has_vacancy === true,
      })),
    }));
  } catch {
    console.error('[VERIFIER] Failed to parse response, returning original');
    return buildings;
  }
}

// ════════════════════════════════════════════════════════════
// GAP FILLER: Server-side — fill missing floors between 1 and max
// ════════════════════════════════════════════════════════════

export function fillFloorGaps(buildings: LobbySignResult): LobbySignResult {
  return buildings.map((b) => {
    if (!b.floors.length) return b;

    const floorNums = b.floors.map(f => parseInt(f.floor_number)).filter(n => !isNaN(n));
    const maxFloor = Math.max(...floorNums);
    const minFloor = Math.min(...floorNums, 1); // at least floor 1

    // Update floor_count to highest floor number
    b.floor_count = Math.max(b.floor_count, maxFloor);

    const existingFloors = new Set(floorNums);
    const newFloors: FloorData[] = [];

    // Fill every floor from min to max
    for (let i = maxFloor; i >= minFloor; i--) {
      if (existingFloors.has(i)) {
        newFloors.push(b.floors.find(f => parseInt(f.floor_number) === i)!);
      } else {
        // Empty/unknown floor
        newFloors.push({
          floor_number: String(i),
          tenants: [],
          has_vacancy: false,
        });
      }
    }

    return { ...b, floors: newFloors };
  });
}

// ════════════════════════════════════════════════════════════
// PATH 2: VACANCY LISTING — ADK 3-agent pipeline
// Agent 1: Parser — reads the PDF, dumps clean text
// Agent 2: Buildings counter — names + cities + basic data
// Agent 3: Floors extractor — vacant floors per building
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
  model: PRO,
  instruction: `Read the uploaded document and output ALL of its text content.

This is an Israeli commercial real estate document with office spaces for rent.

OUTPUT:
- page_count: number of pages
- document_type: what it is
- summary: one paragraph describing the document
- full_text: ALL text from every page separated by ---PAGE N---

Include EVERY number, price (₪/ILS), area (מ"ר/sqm), date, phone, email, name.
Do NOT output binary or base64 data.`,
  outputSchema: parserSchema,
  outputKey: 'parsed_content',
  includeContents: 'default',
  generateContentConfig: { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } },
});

const buildingsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    building_count: { type: Type.STRING },
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
          total_sqm: { type: Type.STRING },
          asking_rent_sqm: { type: Type.STRING },
          management_fee_sqm: { type: Type.STRING },
          delivery_condition: { type: Type.STRING },
          contact_name: { type: Type.STRING },
          contact_phone: { type: Type.STRING },
          contact_email: { type: Type.STRING },
          is_sublease: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: ['name'],
      },
    },
  },
  required: ['building_count', 'buildings'],
};

const buildingsAgent = new LlmAgent({
  name: 'buildings_counter',
  model: PRO,
  instruction: `Count every building in the parsed document and extract their basic info.

## Parsed content:
{parsed_content}

For each building: name, name_en, address, city, city_en, total_sqm, asking_rent_sqm, management_fee_sqm, delivery_condition, contacts, is_sublease.

City mapping: הרצליה=Herzliya, תל אביב=Tel Aviv, רמת גן=Ramat Gan, חולון=Holon, פתח תקווה=Petah Tikva, חיפה=Haifa, רעננה=Raanana, הוד השרון=Hod HaSharon, מודיעין=Modiin, ירושלים=Jerusalem, אור יהודה=Or Yehuda.
"רמת החייל ת"א" → city: "תל אביב". "הרצליה פיתוח" → city: "הרצליה". "קריית אריה פ"ת" → city: "פתח תקווה".

Omit fields with no data.`,
  outputSchema: buildingsSchema,
  outputKey: 'buildings_data',
  includeContents: 'default',
  generateContentConfig: { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } },
});

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
                floor_number: { type: Type.STRING },
                sqm: { type: Type.STRING },
                status: { type: Type.STRING },
                delivery_condition: { type: Type.STRING },
                rent_per_sqm: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
              required: ['floor_number', 'sqm'],
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
  model: PRO,
  instruction: `Find the vacant floors/spaces for each building listed in the previous step.

## Parsed content:
{parsed_content}

## Buildings to find floors for:
{buildings_data}

For each building, extract available spaces:
- floor_number (קומה N, or "0" for ground floor)
- sqm (area in sqm)
- status: "vacant" (all listed spaces are available for rent)
- delivery_condition: turnkey, furnished, shell_and_core, as_is, as_is_new
- rent_per_sqm if stated per floor
- notes

Hebrew: "• קומה N: XXX מ״ר" = floor N, XXX sqm. "קומת קרקע" = floor 0.
All spaces in these listings are VACANT.`,
  outputSchema: floorsSchema,
  outputKey: 'floors_data',
  includeContents: 'default',
  generateContentConfig: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
});

const vacancyPipeline = new SequentialAgent({
  name: 'vacancy_pipeline',
  subAgents: [parserAgent, buildingsAgent, floorsAgent],
  description: 'Parse → Count buildings → Extract floors',
});

export function createVacancyRunner() {
  return new InMemoryRunner({
    agent: vacancyPipeline,
    appName: 'stax-import',
  });
}
