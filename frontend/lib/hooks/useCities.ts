import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-client';

export interface CityInfo {
  city: string
  city_en: string | null
  count: number
}

interface UseCities {
  cities: CityInfo[]
  loading: boolean
}

export function useCities(): UseCities {
  const [cities, setCities] = useState<CityInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCities() {
      const { data, error } = await supabaseBrowser
        .from('buildings')
        .select('city, city_en');

      if (error || !data) {
        // Fallback: just Herzliya
        setCities([{ city: 'הרצליה', city_en: 'Herzliya', count: 17 }]);
        setLoading(false);
        return;
      }

      // Group by city — pick best city_en (non-default, non-null)
      const map = new Map<string, { city_en: string | null; count: number }>();
      for (const row of data) {
        const existing = map.get(row.city);
        if (existing) {
          existing.count++;
          // Prefer a city_en that actually matches the city (not the DB default "Herzliya")
          if (row.city_en && row.city_en !== 'Herzliya' && row.city !== 'הרצליה') {
            existing.city_en = row.city_en;
          }
        } else {
          map.set(row.city, { city_en: row.city_en, count: 1 });
        }
      }

      const fromDb: CityInfo[] = Array.from(map.entries())
        .map(([city, info]) => ({ city, city_en: info.city_en, count: info.count }))
        .sort((a, b) => b.count - a.count);

      // Always show major Israeli cities even if empty
      const defaultCities: CityInfo[] = [
        { city: 'תל אביב', city_en: 'Tel Aviv', count: 0 },
        { city: 'רמת גן', city_en: 'Ramat Gan', count: 0 },
        { city: 'פתח תקווה', city_en: 'Petah Tikva', count: 0 },
        { city: 'בני ברק', city_en: 'Bnei Brak', count: 0 },
        { city: 'נתניה', city_en: 'Netanya', count: 0 },
        { city: 'חיפה', city_en: 'Haifa', count: 0 },
        { city: 'ירושלים', city_en: 'Jerusalem', count: 0 },
        { city: 'באר שבע', city_en: 'Beer Sheva', count: 0 },
        { city: 'ראשון לציון', city_en: 'Rishon LeZion', count: 0 },
        { city: 'חולון', city_en: 'Holon', count: 0 },
        { city: 'רעננה', city_en: 'Raanana', count: 0 },
        { city: 'הוד השרון', city_en: 'Hod HaSharon', count: 0 },
        { city: 'מודיעין', city_en: 'Modiin', count: 0 },
        { city: 'כפר סבא', city_en: 'Kfar Saba', count: 0 },
        { city: 'רחובות', city_en: 'Rehovot', count: 0 },
        { city: 'אשדוד', city_en: 'Ashdod', count: 0 },
      ];

      // Merge: DB cities first (with counts), then defaults that aren't already in DB
      const dbCityNames = new Set(fromDb.map((c) => c.city));
      const merged = [
        ...fromDb,
        ...defaultCities.filter((c) => !dbCityNames.has(c.city)),
      ];

      setCities(merged);
      setLoading(false);
    }

    fetchCities();
  }, []);

  return { cities, loading };
}
