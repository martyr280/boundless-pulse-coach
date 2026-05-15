import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FrameworkContent {
  id: string;
  slug: string;
  title: string;
  body: string;
  kind: 'vision' | 'year_priority' | 'prompt' | 'general';
  version: number;
  is_active: boolean;
}

/** Fetch the currently-active framework copy for a given slug. */
export function useFrameworkContent(slug: string | null) {
  return useQuery({
    queryKey: ['framework_content', slug],
    enabled: !!slug,
    queryFn: async (): Promise<FrameworkContent | null> => {
      const { data, error } = await supabase
        .from('framework_content')
        .select('id, slug, title, body, kind, version, is_active')
        .eq('slug', slug!)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return (data as FrameworkContent) ?? null;
    },
  });
}
