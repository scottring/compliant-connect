# Advanced Supabase MCP Server

This guide explains how to use the advanced Supabase MCP Server for more powerful database operations.

## Overview

While the built-in MCP connection in Cursor allows for read-only database queries, the advanced Supabase MCP Server provides:

1. **Write operations** - Create, update, and delete database records
2. **Management API access** - Control Supabase settings programmatically
3. **Auth Admin tools** - Manage users and permissions
4. **Schema management** - Create tables, indexes, and functions
5. **RLS policy management** - Configure Row Level Security
6. **Storage management** - Create and manage storage buckets

## Setup

We have configured three environments for the Supabase MCP Server:

- **Development** (aybytyqwuhtsjigxgxwl)
- **Staging** (pumnvugsxlcexdvtqvvo)
- **Production** (ntsoctffiqvrbgyeurjc)

## Running the Server

Use these npm scripts to start the MCP server for each environment:

```bash
# Development environment
npm run mcp:dev

# Staging environment
npm run mcp:staging

# Production environment
npm run mcp:prod
```

## Using the Server

When the server is running, you can use these operations in Claude:

### 1. Execute SQL (with write capability)

```
<function_calls>
<invoke name="mcp_supabase_sql_execute">
<parameter name="sql">INSERT INTO users (email, name) VALUES ('test@example.com', 'Test User');</parameter>
</invoke>
</function_calls>
```

### 2. Create a Table

```
<function_calls>
<invoke name="mcp_supabase_create_table">
<parameter name="table_name">new_table</parameter>
<parameter name="columns">[
  {"name": "id", "type": "uuid", "primary": true, "default": "gen_random_uuid()"},
  {"name": "name", "type": "text", "nullable": false},
  {"name": "created_at", "type": "timestamp with time zone", "default": "now()"}
]</parameter>
</invoke>
</function_calls>
```

### 3. Create RLS Policy

```
<function_calls>
<invoke name="mcp_supabase_create_policy">
<parameter name="table_name">users</parameter>
<parameter name="policy_name">users_select_policy</parameter>
<parameter name="operation">SELECT</parameter>
<parameter name="expression">auth.uid() = id</parameter>
</invoke>
</function_calls>
```

### 4. Create a User

```
<function_calls>
<invoke name="mcp_supabase_create_user">
<parameter name="email">new_user@example.com</parameter>
<parameter name="password">securePassword123</parameter>
<parameter name="user_metadata">{"full_name": "New User", "company_id": "123"}</parameter>
</invoke>
</function_calls>
```

### 5. Create a Storage Bucket

```
<function_calls>
<invoke name="mcp_supabase_create_bucket">
<parameter name="bucket_name">user-uploads</parameter>
<parameter name="public">false</parameter>
</invoke>
</function_calls>
```

### 6. List Tables

```
<function_calls>
<invoke name="mcp_supabase_list_tables">
</invoke>
</function_calls>
```

### 7. Get Database Schema

```
<function_calls>
<invoke name="mcp_supabase_get_schema">
</invoke>
</function_calls>
```

## Safety Controls

The advanced MCP server includes several safety features:

1. **Environment-aware operations** - Different settings for dev/staging/prod
2. **Write protection** - Confirmation required for destructive operations
3. **Schema validation** - Prevents accidental schema changes in production
4. **User operation auditing** - Logs all operations for accountability

## Further Reading

For more details, see the official Supabase MCP Server documentation at:
https://github.com/alexander-zuev/supabase-mcp-server

## Note

The exact function names and parameters may vary slightly based on the version of the Supabase MCP Server. Always refer to the latest documentation for the most accurate information. 