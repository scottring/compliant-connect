import { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'owner' | 'admin' | 'member';

export type RelationshipStatus = 'pending' | 'active' | 'inactive' | 'blocked';
export type RelationshipType = 'direct' | 'indirect' | 'potential';

export interface Profile {
  firstName: string;
  lastName: string;
}

export interface SupplierRelationship {
  id: string;
  customer_id: string;
  supplier_id: string;
  status: RelationshipStatus;
  type: RelationshipType;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  created_at?: string;
  updated_at?: string;
  relationship?: SupplierRelationship;
}

export interface UserCompany extends Company {
  userRole: UserRole;
}

export interface ExtendedUser extends SupabaseUser {
  profile?: Profile;
  companies?: Company[];
  currentCompany?: Company | null;
  role?: string;
}
