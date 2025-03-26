# Technical Context

## Technology Stack

### Frontend
- Next.js 14
- React 18
- TypeScript 5
- Tailwind CSS
- ShadcnUI
- React Hook Form
- Zod validation

### Backend
- Supabase
  - Authentication
  - PostgreSQL Database
  - Row Level Security
  - Real-time subscriptions
  - Storage
  - Edge Functions

### Development Tools
- VS Code / Cursor IDE
- Git for version control
- ESLint for code quality
- Prettier for code formatting
- Model Context Protocol (MCP) for database operations

## Authentication Implementation

### 1. Supabase Auth Configuration
```typescript
// Auth Client Configuration
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Server-side Auth Configuration
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

### 2. Database Schema
```sql
-- Users and Profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies
CREATE TABLE public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('supplier', 'customer', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Users
CREATE TABLE public.company_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Company Relationships
CREATE TABLE public.company_relationships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_company_id UUID REFERENCES public.companies(id),
  supplier_company_id UUID REFERENCES public.companies(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_company_id, supplier_company_id)
);
```

### 3. Row Level Security Policies
```sql
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view associated companies"
  ON public.companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_id = id
      AND user_id = auth.uid()
    )
  );

-- Company Users
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own associations"
  ON public.company_users FOR SELECT
  USING (user_id = auth.uid());

-- Company Relationships
ALTER TABLE public.company_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view relationships for their companies"
  ON public.company_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE (company_id = customer_company_id OR company_id = supplier_company_id)
      AND user_id = auth.uid()
    )
  );
```

## Development Setup

### Prerequisites
1. Node.js 18+
2. npm or yarn
3. Git
4. Supabase CLI

### Environment Configuration
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### Environment Management
- Development: Local development environment
  - Mock data enabled
  - Debug tools enabled
  - Development Supabase instance

- Staging: Testing environment
  - Real data
  - Debug tools enabled
  - Staging Supabase instance

- Production: Live environment
  - Real data only
  - Debug tools disabled
  - Production Supabase instance

### Model Context Protocol (MCP)
All three Supabase environments are configured with MCP servers in Cursor for direct database queries:

- `supabase_dev` - Development environment querying
- `supabase_staging` - Staging environment querying
- `supabase_prod` - Production environment querying
- `supabase_advanced` - Enhanced MCP server with write capabilities

The standard connections are read-only and can be used for database exploration, schema analysis, and data verification across environments. 

The advanced MCP server supports write operations and administrative functions such as:
- Creating/modifying tables and schemas
- Managing users and authentication
- Setting up Row Level Security policies
- Creating and managing storage buckets

Documentation is available in `docs/supabase-mcp.md` and `docs/supabase-mcp-advanced.md`.

### Build Commands
```bash
# Development
npm run dev           # Start dev server
npm run build:dev    # Build for development

# Staging
npm run build:staging # Build for staging
npm run preview:staging # Preview staging build

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Utilities
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run type-check   # Run TypeScript checks

# MCP Servers
npm run mcp:dev      # Start advanced MCP server for development
npm run mcp:staging  # Start advanced MCP server for staging
npm run mcp:prod     # Start advanced MCP server for production
```

## Technical Constraints

### Authentication
1. Session Management
   - JWT-based authentication
   - Auto token refresh
   - Secure session persistence
   - Cross-tab session sync

2. Role-based Access
   - Company-level roles
   - Feature-based permissions
   - Dynamic role switching
   - Secure role validation

3. Data Access
   - Row Level Security enforcement
   - Company relationship validation
   - Real-time permission updates
   - Secure data isolation

### Performance Requirements
1. Authentication
   - Login < 1s
   - Session refresh < 500ms
   - Role switch < 200ms

2. Data Loading
   - Initial load < 2s
   - Subsequent loads < 1s
   - Real-time updates < 100ms

### Security Requirements
1. Authentication
   - HTTPS only
   - Secure session storage
   - CSRF protection
   - Rate limiting

2. Data Access
   - Row Level Security
   - Input validation
   - Output sanitization
   - Audit logging

## Dependencies

### Production Dependencies
```json
{
  "@supabase/auth-helpers-nextjs": "^0.8.0",
  "@supabase/supabase-js": "^2.38.0",
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "@hookform/resolvers": "^3.3.0",
  "react-hook-form": "^7.47.0",
  "zod": "^3.22.0",
  "tailwindcss": "^3.3.0",
  "shadcn-ui": "^0.4.0"
}
```

### Development Dependencies
```json
{
  "typescript": "^5.2.0",
  "eslint": "^8.50.0",
  "prettier": "^3.0.0",
  "@types/react": "^18.2.0",
  "@types/node": "^18.18.0"
}
```

## Deployment
- Vercel for frontend
- Supabase for backend
- Environment-specific configurations
- CI/CD pipeline setup 

## MVP Implementation Focus (Target: 3 PM Today)

### Core Technical Components

1. **Question Bank System**
   ```typescript
   interface QuestionBank {
     // Question Types
     type QuestionType = 'text' | 'number' | 'select' | 'multiselect' | 'file';
     
     // Question Definition
     interface Question {
       id: string;
       text: string;
       type: QuestionType;
       required: boolean;
       options?: string[];
       validation?: {
         min?: number;
         max?: number;
         pattern?: string;
         fileTypes?: string[];
       };
     }
     
     // Question Management
     questions: {
       create: (question: Question) => Promise<void>;
       update: (id: string, question: Partial<Question>) => Promise<void>;
       delete: (id: string) => Promise<void>;
       list: () => Promise<Question[]>;
     };
   }
   ```

2. **PIR System**
   ```typescript
   interface PIRSystem {
     // PIR Types
     type PIRStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'in_review' | 'approved' | 'rejected';
     
     // PIR Definition
     interface PIR {
       id: string;
       title: string;
       description: string;
       supplierId: string;
       customerId: string;
       questions: Question[];
       status: PIRStatus;
       dueDate: Date;
       created_at: Date;
       updated_at: Date;
     }
     
     // Response Definition
     interface PIRResponse {
       id: string;
       pirId: string;
       answers: {
         questionId: string;
         value: string | number | string[];
         files?: string[];
       }[];
       status: PIRStatus;
       submitted_at?: Date;
       reviewed_at?: Date;
     }
     
     // PIR Management
     pir: {
       create: (pir: PIR) => Promise<void>;
       update: (id: string, pir: Partial<PIR>) => Promise<void>;
       delete: (id: string) => Promise<void>;
       submit: (id: string) => Promise<void>;
       review: (id: string, approved: boolean, comments?: string) => Promise<void>;
     };
     
     // Response Management
     response: {
       create: (response: PIRResponse) => Promise<void>;
       update: (id: string, response: Partial<PIRResponse>) => Promise<void>;
       submit: (id: string) => Promise<void>;
     };
   }
   ```

3. **Database Schema**
   ```sql
   -- Question Bank
   CREATE TABLE public.questions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     text TEXT NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'multiselect', 'file')),
     required BOOLEAN DEFAULT false,
     options JSONB,
     validation JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- PIR Tables
   CREATE TABLE public.pirs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     title TEXT NOT NULL,
     description TEXT,
     supplier_id UUID REFERENCES public.companies(id),
     customer_id UUID REFERENCES public.companies(id),
     questions JSONB NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'in_progress', 'submitted', 'in_review', 'approved', 'rejected')),
     due_date TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE public.pir_responses (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     pir_id UUID REFERENCES public.pirs(id),
     answers JSONB NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
     submitted_at TIMESTAMP WITH TIME ZONE,
     reviewed_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- PIR Files
   CREATE TABLE public.pir_files (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     pir_id UUID REFERENCES public.pirs(id),
     response_id UUID REFERENCES public.pir_responses(id),
     question_id UUID REFERENCES public.questions(id),
     file_path TEXT NOT NULL,
     file_name TEXT NOT NULL,
     file_type TEXT NOT NULL,
     file_size INTEGER NOT NULL,
     uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. **Row Level Security**
   ```sql
   -- Questions RLS
   ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view questions"
     ON public.questions FOR SELECT
     USING (true);

   -- PIRs RLS
   ALTER TABLE public.pirs ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view PIRs for their company"
     ON public.pirs FOR SELECT
     USING (
       supplier_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
       OR 
       customer_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
     );

   -- PIR Responses RLS
   ALTER TABLE public.pir_responses ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view responses for their PIRs"
     ON public.pir_responses FOR SELECT
     USING (
       pir_id IN (
         SELECT id FROM public.pirs
         WHERE supplier_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
         OR customer_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
       )
     );

   -- PIR Files RLS
   ALTER TABLE public.pir_files ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view files for their PIRs"
     ON public.pir_files FOR SELECT
     USING (
       pir_id IN (
         SELECT id FROM public.pirs
         WHERE supplier_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
         OR customer_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
       )
     );
   ```

### Implementation Requirements

1. **Question Bank**
   - Question CRUD operations
   - Question type validation
   - Option management
   - File type restrictions

2. **PIR System**
   - PIR creation and management
   - Response submission
   - Review workflow
   - File handling

3. **User Interface**
   - Question bank management
   - PIR creation wizard
   - Response forms
   - Review dashboard

4. **Access Control**
   - Role-based PIR access
   - Company data isolation
   - File access control
   - Workflow permissions

### Performance Requirements
- Question bank load < 1s
- PIR creation < 2s
- File upload < 5s
- Response save < 500ms

### Security Requirements
- Secure file storage
- Role-based access
- Data isolation
- Input validation

### Error Handling
```typescript
interface ErrorHandling {
  // Error Types
  type PIRError = {
    code: 'QUESTION_ERROR' | 'PIR_ERROR' | 'RESPONSE_ERROR' | 'FILE_ERROR';
    message: string;
    details?: any;
  };

  // Error Handlers
  handlers: {
    handleQuestionError: (error: any) => PIRError;
    handlePIRError: (error: any) => PIRError;
    handleResponseError: (error: any) => PIRError;
    handleFileError: (error: any) => PIRError;
  };

  // Recovery
  recovery: {
    retryUpload: () => Promise<void>;
    saveProgress: () => Promise<void>;
    restoreState: () => void;
  };
}
``` 