import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Section = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  parent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // View fields
  level?: number;
  path_string?: string;
};

/**
 * Hook to fetch sections from the question_sections table
 */
export const useSections = () => {
  return useQuery<Section[], Error>({
    queryKey: ['sections'],
    queryFn: async () => {
      console.log('[DEBUG] Fetching all sections from question_sections table');
      // Directly query the question_sections table to get all sections
      const { data, error } = await supabase
        .from('question_sections')
        .select('id, name, description, order_index, parent_id, created_at, updated_at')
        .order('order_index');
      
      if (error) {
        console.error('[ERROR] Failed to fetch sections:', error);
        throw new Error(`Failed to fetch sections: ${error.message}`);
      }
      
      // Process data to ensure all sections have valid names
      const processedData = (data || []).map(section => {
        // Fix any sections with missing or problematic names
        if (!section.name || section.name.trim() === '') {
          return {
            ...section,
            name: `Section ${section.id.substring(0, 6)}`
          };
        }
        return section;
      });
      
      console.log('[DEBUG] Fetched sections data:', processedData);
      return processedData;
    }
  });
}; 