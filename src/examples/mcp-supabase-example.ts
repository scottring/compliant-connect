/**
 * Examples for using Model Context Protocol with Supabase
 * 
 * This file shows how to use the MCP functions for each Supabase environment (dev, staging, prod)
 * 
 * Note: This is for documentation purposes only. These functions are only available
 * in Claude scripts running within Cursor, not in your application code.
 */

/*
 * Dev Environment Example
 * 
 * <function_calls>
 * <invoke name="mcp_supabase_dev_query">
 * <parameter name="sql">SELECT * FROM your_table LIMIT 10;
 */

// Function to query the dev environment
async function queryDevEnvironment() {
  // Import the mcp_supabase_dev_query function
  // This is used in Claude scripts in Cursor
  
  // Example query:
  // <function_calls>
  // <invoke name="mcp_supabase_dev_query">
  // <parameter name="sql">SELECT * FROM your_table LIMIT 10;
} 