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
- PostgreSQL
- Row Level Security
- Real-time subscriptions

### Development Tools
- VS Code / Cursor IDE
- Git for version control
- ESLint for code quality
- Prettier for code formatting
- Model Context Protocol (MCP) for Supabase querying in Cursor
- Advanced Supabase MCP Server for write operations and management

## Development Setup

### Prerequisites
1. Node.js 18+
2. npm or yarn
3. Git
4. Supabase CLI

### Environment Configuration
We use environment-specific configuration files for different deployment stages:

1. `.env.development` - Development environment
2. `.env.staging` - Staging environment
3. `.env.production` - Production environment
4. `.env.example` - Template for environment variables

Key environment variables:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
VITE_APP_NAME="Compliant Connect"
VITE_APP_ENV=development # development, staging, production

# Feature Flags
VITE_ENABLE_MOCK_DATA=true # Set to false in production
VITE_ENABLE_DEBUG_TOOLS=true # Set to false in production
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
- Must use Supabase Auth
- Support for multiple roles per user
- Secure session management

### Data Access
- Row Level Security for data isolation
- Company relationship-based access control
- Real-time updates where appropriate

### Performance
- Optimize for large datasets
- Efficient form handling
- Smart caching strategies

### Security
- Secure data transmission
- Input validation
- XSS prevention
- CSRF protection

## Dependencies

### Production Dependencies
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "@supabase/supabase-js": "latest",
  "@supabase/auth-helpers-nextjs": "latest",
  "tailwindcss": "^3.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.0.0",
  "shadcn-ui": "latest"
}
```

### Development Dependencies
```json
{
  "typescript": "^5.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "@types/react": "^18.0.0",
  "@types/node": "^18.0.0"
}
```

## Deployment
- Vercel for frontend
- Supabase for backend
- Environment-specific configurations
- CI/CD pipeline setup 