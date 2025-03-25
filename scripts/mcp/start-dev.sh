#!/bin/bash
# Start the Supabase MCP server for the development environment

echo "Starting Supabase MCP server for development environment..."
env $(cat ~/.supabase-mcp-configs/dev.env | xargs) supabase-mcp-server 