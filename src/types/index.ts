
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
};

export type CompanyRole = 'supplier' | 'customer' | 'both';

export type Company = {
  id: string;
  name: string;
  role: CompanyRole;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  progress: number;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  description?: string;
};

export type ColumnType = 'text' | 'number' | 'boolean' | 'select' | 'multi-select';

export type TableNestedColumn = {
  name: string;
  type: ColumnType;
  options?: string[];
};

export type TableColumn = {
  name: string;
  type: ColumnType;
  options?: string[];
  nested?: boolean;
  nestedColumns?: TableNestedColumn[];
};

export type Section = {
  id: string;
  name: string;
  order: number;
};

export type Subsection = {
  id: string;
  sectionId: string;
  name: string;
  order: number;
};

export type Question = {
  id: string;
  text: string;
  tags: Tag[];
  type: 'text' | 'number' | 'boolean' | 'select' | 'multi-select' | 'table' | 'file';
  options?: string[];
  tableColumns?: TableColumn[];
  required: boolean;
  sectionId?: string;
  subsectionId?: string;
  order?: number;
};

export type Answer = {
  id: string;
  questionId: string;
  value: string | number | boolean | string[];
  flags?: Flag[];
  comments?: Comment[];
};

export type Flag = {
  id: string;
  answerId: string;
  comment: string;
  createdBy: string;
  createdAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
};

export type Comment = {
  id: string;
  answerId: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
};

export type ProductSheet = {
  id: string;
  name: string;
  description?: string;
  supplierId: string;
  requestedById: string;
  status: 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected';
  questions: Question[];
  answers: Answer[];
  createdAt: Date;
  updatedAt: Date;
  tags: Tag[];
};

export type RequestStatus = 'pending' | 'submitted' | 'reviewing' | 'approved' | 'rejected';

export type Request = {
  id: string;
  productSheetId: string;
  fromCompanyId: string;
  toCompanyId: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
};
