#!/bin/bash
# Start the Supabase MCP server for the staging environment

echo "Starting Supabase MCP server for staging environment..."
env $(cat ~/.supabase-mcp-configs/staging.env | xargs) supabase-mcp-server 