import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-client';

export interface RecentImport {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number | null
  document_type: string
  ai_status: string
  ai_confidence: number | null
  ai_model: string | null
  storage_path: string
  created_at: string
  building_count: number
}

interface UseRecentImports {
  imports: RecentImport[]
  loading: boolean
  refetch: () => void
}

export function useRecentImports(): UseRecentImports {
  const [imports, setImports] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImports = async () => {
    const { data, error } = await supabaseBrowser
      .from('documents')
      .select('id, file_name, file_type, file_size_bytes, document_type, ai_status, ai_confidence, ai_model, storage_path, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) {
      setImports([]);
      setLoading(false);
      return;
    }

    // Count buildings linked to each document
    const results: RecentImport[] = [];
    for (const doc of data) {
      const { count } = await supabaseBrowser
        .from('buildings')
        .select('id', { count: 'exact', head: true })
        .eq('source_document_id', doc.id);

      results.push({
        ...doc,
        building_count: count ?? 0,
      });
    }

    setImports(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchImports();
  }, []);

  return { imports, loading, refetch: fetchImports };
}
