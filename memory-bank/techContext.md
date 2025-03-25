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

## Development Setup

### Prerequisites
1. Node.js 18+
2. npm or yarn
3. Git
4. Supabase CLI

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Local Development
1. Clone repository
2. Install dependencies
3. Set up environment variables
4. Start development server

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