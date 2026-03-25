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

      const result: CityInfo[] = Array.from(map.entries())
        .map(([city, info]) => ({ city, city_en: info.city_en, count: info.count }))
        .sort((a, b) => b.count - a.count);

      setCities(result);
      setLoading(false);
    }

    fetchCities();
  }, []);

  return { cities, loading };
}
