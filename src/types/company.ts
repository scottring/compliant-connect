import { Database } from './supabase';

export type Company = Database['public']['Tables']['companies']['Row'];
export type InsertCompany = Database['public']['Tables']['companies']['Insert'];
export type UpdateCompany = Database['public']['Tables']['companies']['Update']; 