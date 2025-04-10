import { Database } from './supabase';

export type Tag = Database['public']['Tables']['tags']['Row'];
export type InsertTag = Database['public']['Tables']['tags']['Insert'];
export type UpdateTag = Database['public']['Tables']['tags']['Update']; 