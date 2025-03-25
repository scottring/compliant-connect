#!/bin/bash
# Start the Supabase MCP server for the production environment

echo "Starting Supabase MCP server for production environment..."
env $(cat ~/.supabase-mcp-configs/prod.env | xargs) supabase-mcp-server 