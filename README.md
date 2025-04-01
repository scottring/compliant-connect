# Compliant Connect

A compliance management platform for supplier-customer relationships.

## Development Environment Setup

### Prerequisites

1. Node.js 18+ - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
2. pnpm - [installation guide](https://pnpm.io/installation)
3. Git
4. A code editor (VS Code/Cursor recommended)

### Environment Setup

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd compliant-connect
```

2. Install dependencies:
```sh
pnpm install
```

3. Configure environment variables:
```sh
# Copy the example environment file
cp .env.example .env

# Edit .env with your Supabase credentials
# Get these from the Supabase project dashboard (oecravfbvupqgzfyizsi)
```

4. Start the development server:
```sh
pnpm dev
```

### Cloud Database Configuration

This project uses a cloud-based Supabase instance for all environments:

- **Project Name**: stacks-2025.03.25
- **Project ID**: oecravfbvupqgzfyizsi
- **Region**: eu-central-1
- **Environment**: Development

⚠️ Important Notes:
- The local Docker development environment is deprecated
- Always use the cloud database for development
- Never commit sensitive credentials to version control
- Keep your `.env` file secure and local

## Technology Stack

### Frontend
- Vite
- React 18
- TypeScript
- TailwindCSS
- ShadcnUI Components
- React Query for data management

### Backend (Supabase)
- Authentication
- PostgreSQL Database
- Row Level Security
- Real-time subscriptions
- Storage
- Edge Functions

## Development Workflow

1. **Code Organization**
   - Features are organized in feature-based directories
   - Shared components in `src/components/common`
   - Utilities in `src/utils`
   - Types in `src/types`

2. **State Management**
   - Server state: React Query
   - Local state: React hooks
   - Global state: React Context

3. **Data Access**
   - All database access through Supabase client
   - Row Level Security enforces access control
   - Real-time subscriptions for live updates

4. **Authentication**
   - Supabase Auth with email/password
   - JWT-based session management
   - Role-based access control

## Available Scripts

```sh
# Development
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm preview       # Preview production build

# Code Quality
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix linting issues
pnpm type-check   # Run TypeScript checks
```

## Documentation

- [Technical Context](memory-bank/techContext.md)
- [Project Brief](memory-bank/projectbrief.md)
- [System Patterns](memory-bank/systemPatterns.md)
- [Progress](memory-bank/progress.md)

## Support

For any technical issues or questions, please refer to the documentation in the `memory-bank` directory or contact the development team.
