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
  customerId: string;
  supplierId: string;
  status: RelationshipStatus;
  type: RelationshipType;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  role: "supplier" | "customer" | "both";
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  progress: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  createdAt?: string;
  updatedAt?: string;
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