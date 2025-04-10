// Debug script to test question_sections data retrieval
// Run with: node scripts/debug-sections.js

const { createClient } = require('@supabase/supabase-js');

// Supabase project details
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aybytyqwuhtsjigxgxwl.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: No Supabase API key found. Set VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugQuestionSections() {
  console.log('Fetching all question_sections data...');
  
  try {
    // Query the question_sections table without any filters
    const { data, error } = await supabase
      .from('question_sections')
      .select('*')
      .order('order_index');
    
    if (error) {
      console.error('Error fetching question_sections:', error);
      return;
    }
    
    console.log('Total sections found:', data.length);
    console.log('Sections data:', JSON.stringify(data, null, 2));
    
    // Check for any potential issues
    if (data.length === 0) {
      console.warn('No sections found in the database.');
    } else if (data.length === 1) {
      console.warn('Only one section found. Verify if this is correct.');
    }
    
    // Check if all sections have name values
    const missingNames = data.filter(section => !section.name);
    if (missingNames.length > 0) {
      console.warn('Found sections with missing names:', missingNames);
    }
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

// Run the debug function
debugQuestionSections()
  .then(() => console.log('Debug completed'))
  .catch(err => console.error('Fatal error:', err)); 