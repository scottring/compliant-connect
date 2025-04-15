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
- @tanstack/react-query (React Query v5) for server state management

### Backend
- Supabase
  - Authentication
  - PostgreSQL Database
  - Row Level Security
  - Real-time subscriptions
  - Storage
  - Edge Functions
  - RPC Functions

### Development Tools
- VS Code / Cursor IDE
- Git for version control
- ESLint for code quality
- Prettier for code formatting
- Model Context Protocol (MCP) for database operations
- Vite for fast development

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
  email TEXT,
  phone TEXT,
  contact_name TEXT,
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

-- Sections for question organization
CREATE TABLE public.sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subsections for question organization
CREATE TABLE public.subsections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_id UUID REFERENCES public.sections(id),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions
CREATE TABLE public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subsection_id UUID REFERENCES public.subsections(id),
  text TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('text', 'number', 'boolean', 'select', 'multi-select', 'file', 'table')),
  required BOOLEAN DEFAULT false,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags for compliance categories
CREATE TABLE public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question-Tag Association
CREATE TABLE public.question_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, tag_id)
);

-- PIR Requests
CREATE TABLE public.pir_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_company_id UUID REFERENCES public.companies(id),
  supplier_company_id UUID REFERENCES public.companies(id),
  product_id UUID,
  status TEXT DEFAULT 'new',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Sections
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sections"
  ON public.sections FOR SELECT
  USING (true);
CREATE POLICY "Admin users can create sections"
  ON public.sections FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Subsections
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subsections"
  ON public.subsections FOR SELECT
  USING (true);
CREATE POLICY "Admin users can create subsections"
  ON public.subsections FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view questions"
  ON public.questions FOR SELECT
  USING (true);
CREATE POLICY "Admin users can manage questions"
  ON public.questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tags"
  ON public.tags FOR SELECT
  USING (true);
CREATE POLICY "Admin users can manage tags"
  ON public.tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Question Tags
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view question tags"
  ON public.question_tags FOR SELECT
  USING (true);
CREATE POLICY "Admin users can manage question tags"
  ON public.question_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

### 4. RPC Functions
```sql
-- Create a question with tags in a single transaction
CREATE OR REPLACE FUNCTION create_question_with_tags(
  p_subsection_id UUID,
  p_text TEXT,
  p_description TEXT,
  p_type TEXT,
  p_required BOOLEAN,
  p_options JSONB,
  p_tag_ids UUID[]
) RETURNS JSON AS $$
DECLARE
  v_question_id UUID;
  v_tag_id UUID;
  v_result JSON;
BEGIN
  -- Insert the question first
  INSERT INTO public.questions (
    subsection_id,
    text,
    description,
    type,
    required,
    options
  ) VALUES (
    p_subsection_id,
    p_text,
    p_description,
    p_type,
    p_required,
    p_options
  ) RETURNING id INTO v_question_id;
  
  -- Then insert the question-tag associations
  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    FOREACH v_tag_id IN ARRAY p_tag_ids
    LOOP
      INSERT INTO public.question_tags (question_id, tag_id)
      VALUES (v_question_id, v_tag_id);
    END LOOP;
  END IF;
  
  -- Return the new question as JSON
  SELECT json_build_object(
    'id', q.id,
    'subsection_id', q.subsection_id,
    'text', q.text,
    'description', q.description,
    'type', q.type,
    'required', q.required,
    'options', q.options,
    'created_at', q.created_at,
    'updated_at', q.updated_at
  ) INTO v_result
  FROM public.questions q
  WHERE q.id = v_question_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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

## Question Bank Implementation

### 1. Data Structure
```typescript
// Section Type
export type Section = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

// Subsection Type
export type Subsection = {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

// Question Types
export type QuestionType = 'text' | 'number' | 'boolean' | 'select' | 'multi-select' | 'file' | 'table';

// Database Question Structure
export type DBQuestion = {
  id: string;
  subsection_id: string;
  text: string;
  description: string | null;
  type: QuestionType;
  required: boolean;
  options: any | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};
```

### 2. Hook Implementation
```typescript
// Question Bank Hook
export const useQuestionBank = (): UseQuestionBankReturn => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DBQuestion[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Load all question bank data
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, subsection_id, text, description, type, required, options, created_at, updated_at');

      if (error) throw error;
      
      // Load tags for these questions
      // Process and return questions with tags
    } catch (err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sections and subsections
  const loadSectionsAndSubsections = useCallback(async () => {
    try {
      // Fetch sections
      // Fetch subsections
      // Update state
    } catch (err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, []);

  // Create question with tags using RPC
  const createQuestion = async (question: QuestionInputData): Promise<DBQuestion | null> => {
    try {
      // Extract tags from the question data
      const { tags: selectedTags, ...questionData } = question;
      const tagIds = selectedTags?.map(tag => tag.id) || [];

      // Call the create_question_with_tags RPC function
      const { data: newQuestionData, error: rpcError } = await supabase
        .rpc('create_question_with_tags', {
          p_subsection_id: questionData.subsection_id,
          p_text: questionData.text,
          p_description: questionData.description || null,
          p_type: questionData.type,
          p_required: questionData.required,
          p_options: questionData.options || null,
          p_tag_ids: tagIds
        });

      if (rpcError) throw rpcError;
      
      // Process response and update state
      return processedQuestion;
    } catch (err) {
      // Error handling
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Return hook interface
  return {
    questions,
    sections,
    subsections,
    tags,
    loading,
    error,
    // Methods
  };
};
```

## Best Practices and Patterns

### 1. RPC Usage
- Use RPC functions for complex database operations
- Implement atomic transactions in PostgreSQL functions
- Handle errors properly in RPC calls
- Use type-safe parameters
- Return structured responses

### 2. Error Handling
- Implement consistent error handling patterns
- Log errors to console in development
- Provide user-friendly error messages
- Use toast notifications for user feedback
- Track loading states alongside error states

### 3. State Management
- **Server State:** Use `@tanstack/react-query` (`useQuery`, `useMutation`). Define reusable hooks for mutations. Use query invalidation for updates. Handle loading/error via hook results.
- **Client State:** Use `useState` for local component state. Use React Context (`AuthContext`, potentially others) for global client state if necessary (avoiding duplication of server state).
- **Persisted State:** `usePersistedState` hook used for some state in `AppContext` (NOTE: This conflicts with React Query for server state and should be refactored/removed).

### 4. Data Fetching & Mutations (React Query Pattern)
- Define async fetch/mutation functions that interact with Supabase.
- Wrap these functions with `useQuery` or `useMutation`.
- Use descriptive query keys, including dependencies (e.g., `['suppliers', companyId]`).
- Invalidate relevant queries in `onSuccess` callbacks of mutations.
- Handle loading/error states provided by the hooks in the UI.
- Use RPC functions within mutations for atomic backend operations.

# Development Environment

## Supabase Configuration
- **Production Environment**: Cloud-based Supabase project (eu-central-1)
- **Development Environment**: Cloud-based Supabase project (eu-central-1)
  - Project ID: oecravfbvupqgzfyizsi
  - Project Name: stacks-2025.03.25
  - Region: eu-central-1

## DEPRECATED: Local Docker Environment
The local Docker-based development environment is deprecated and should not be used.
All development should use the cloud-based Supabase project.

## Environment Setup
1. Copy `.env.example` to `.env`
2. Update Supabase configuration with cloud project credentials
3. Never use local Docker for database - always connect to cloud environment

## Development Tools
- Node.js v18+
- pnpm (package manager)
- Vite (build tool)
- React + TypeScript
- TailwindCSS
- ShadcnUI Components

## Key Dependencies
- @supabase/supabase-js: Supabase client
- @tanstack/react-query: Data fetching and caching
- @hookform/resolvers: Form validation
- shadcn/ui: UI components
- tailwindcss: Styling

## Authentication
- Supabase Auth with email/password
- JWT-based session management
- Row Level Security (RLS) policies

## Database
- PostgreSQL (managed by Supabase)
- Prisma for type generation
- Row Level Security (RLS) for data access control
- Real-time subscriptions where needed