import { supabase } from './supabase';
import type { BuildingExtraction } from '../agents/schemas';

export interface DuplicateMatch {
  id: string
  name: string
  name_en: string | null
  address: string
  city: string
  total_sqm: number
  floor_count: number
  asking_rent_sqm: number | null
  vacant_sqm: number
  occupancy_rate: number | null
  similarity: number        // 0-1
  match_reason: string      // "exact_name", "name_contains", "address_match", "name+city"
}

export interface DuplicateResult {
  extracted_index: number
  building_name: string
  matches: DuplicateMatch[]
}

/**
 * For each extracted building, check if a similar one already exists in the DB.
 * Returns only buildings that have at least one match.
 */
export async function findDuplicates(
  buildings: BuildingExtraction[]
): Promise<DuplicateResult[]> {
  const results: DuplicateResult[] = [];

  // Fetch all existing buildings once (more efficient than N queries for small datasets)
  const { data: existing, error } = await supabase
    .from('buildings')
    .select('id, name, name_en, address, city, total_sqm, floor_count, asking_rent_sqm, vacant_sqm, occupancy_rate');

  if (error || !existing) return [];

  for (let i = 0; i < buildings.length; i++) {
    const extracted = buildings[i];
    const matches: DuplicateMatch[] = [];

    for (const row of existing) {
      const score = calculateSimilarity(extracted, row);
      if (score.similarity > 0) {
        matches.push({
          id: row.id,
          name: row.name,
          name_en: row.name_en,
          address: row.address,
          city: row.city,
          total_sqm: row.total_sqm,
          floor_count: row.floor_count,
          asking_rent_sqm: row.asking_rent_sqm,
          vacant_sqm: row.vacant_sqm,
          occupancy_rate: row.occupancy_rate,
          similarity: score.similarity,
          match_reason: score.reason,
        });
      }
    }

    // Sort by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);

    if (matches.length > 0) {
      results.push({
        extracted_index: i,
        building_name: extracted.name,
        matches: matches.slice(0, 3), // top 3 matches max
      });
    }
  }

  return results;
}

function calculateSimilarity(
  extracted: BuildingExtraction,
  existing: { name: string; name_en: string | null; address: string; city: string }
): { similarity: number; reason: string } {
  const eName = normalize(extracted.name);
  const eNameEn = normalize(extracted.name_en || '');
  const eAddress = normalize(extracted.address || '');
  const eCity = normalize(extracted.city || '');

  const dbName = normalize(existing.name);
  const dbNameEn = normalize(existing.name_en || '');
  const dbAddress = normalize(existing.address);
  const dbCity = normalize(existing.city);

  // Exact Hebrew name match
  if (eName && dbName && eName === dbName) {
    return { similarity: 1.0, reason: 'exact_name' };
  }

  // Exact English name match
  if (eNameEn && dbNameEn && eNameEn === dbNameEn) {
    return { similarity: 1.0, reason: 'exact_name_en' };
  }

  // Name contains (one is substring of the other)
  if (eName && dbName && (eName.includes(dbName) || dbName.includes(eName))) {
    const sameCity = eCity === dbCity || !eCity || !dbCity;
    return { similarity: sameCity ? 0.85 : 0.6, reason: 'name_contains' };
  }

  // English name contains
  if (eNameEn && dbNameEn && (eNameEn.includes(dbNameEn) || dbNameEn.includes(eNameEn))) {
    return { similarity: 0.8, reason: 'name_en_contains' };
  }

  // Address match + same city
  if (eAddress && dbAddress && eCity === dbCity) {
    // Extract street number from address for comparison
    const eStreet = extractStreet(eAddress);
    const dbStreet = extractStreet(dbAddress);
    if (eStreet && dbStreet && eStreet === dbStreet) {
      return { similarity: 0.75, reason: 'address_match' };
    }
  }

  // Partial name + same city
  if (eName && dbName && eCity && eCity === dbCity) {
    const nameWords = eName.split(/\s+/);
    const dbWords = dbName.split(/\s+/);
    const overlap = nameWords.filter((w) => w.length > 2 && dbWords.includes(w));
    if (overlap.length >= 1 && overlap.length / Math.max(nameWords.length, dbWords.length) >= 0.3) {
      return { similarity: 0.5, reason: 'name+city' };
    }
  }

  return { similarity: 0, reason: '' };
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[״"']/g, '"')
    .replace(/\s+/g, ' ');
}

function extractStreet(address: string): string {
  // Extract the street part (before comma or city name)
  return normalize(address.split(',')[0]);
}
