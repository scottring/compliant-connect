# Using Supabase with MCP in Cursor

This guide explains how to use Supabase with Claude in Cursor via MCP.

## Available Environments

We have three Supabase environments configured:

1. `supabase_dev` - Development environment
2. `supabase_staging` - Staging environment
3. `supabase_prod` - Production environment

## How to Use Claude with Supabase

In your Cursor conversations with Claude, use these functions:

### Development Environment

```
mcp_supabase_dev_query
```

Example:

```
// Query development database
SELECT * FROM your_table LIMIT 10;
```

### Staging Environment

```
mcp_supabase_staging_query
```

Example:

```
// Query staging database
SELECT * FROM your_table LIMIT 10;
```

### Production Environment

```
mcp_supabase_prod_query
```

Example:

```
// Query production database
SELECT * FROM your_table LIMIT 10;
```

## Safety Tips

1. **Use Read-only Queries**: MCP connections are read-only for safety
2. **Avoid Sensitive Data**: Be mindful of what you query with Claude
3. **Environment-Specific**: Use the appropriate environment for your task
4. **For Exploration**: These are best for exploring data, not production tasks

## Advanced MCP Server

For write operations and advanced features, we've also set up an enhanced Supabase MCP Server. See [Advanced Supabase MCP Server](supabase-mcp-advanced.md) for details on:

- Write operations (INSERT, UPDATE, DELETE)
- Table creation and schema management
- RLS policy management
- User administration
- Storage management

To use the advanced server:

1. Start the server with `npm run mcp:dev` (or staging/prod)
2. Use the enhanced MCP functions in Claude

