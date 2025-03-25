
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resets all application data stored in localStorage and Supabase
 * This will clear all companies, product sheets, questions, etc.
 */
export const resetAllData = async () => {
  try {
    // Check if user is authenticated for Supabase operations
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!session?.user;

    // Always clear localStorage data
    const localStorageKeys = [
      "current-user",
      "companies",
      "product-sheets",
      "questions",
      "tags",
      "sections",
      "subsections"
    ];

    localStorageKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    // Only attempt Supabase operations if authenticated
    if (isAuthenticated) {
      // Clear Supabase data tables in the correct order to avoid foreign key constraints
      // Comments and flags must be deleted before answers
      await supabase.from('comments').delete().is('id', 'not', null);
      await supabase.from('flags').delete().is('id', 'not', null);
      
      // Clear junction tables first
      await supabase.from('question_tags').delete().is('question_id', 'not', null);
      await supabase.from('product_sheet_tags').delete().is('product_sheet_id', 'not', null);
      
      // Clear answers before product sheets
      await supabase.from('answers').delete().is('id', 'not', null);
      
      // Clear questions before sections
      await supabase.from('questions').delete().is('id', 'not', null);
      
      // Clear subsections before sections
      await supabase.from('subsections').delete().is('id', 'not', null);
      
      // Clear main tables
      await supabase.from('product_sheets').delete().is('id', 'not', null);
      await supabase.from('sections').delete().is('id', 'not', null);
      await supabase.from('tags').delete().is('id', 'not', null);
      
      // Don't delete company_users as it might break user access
      // Don't delete companies as it might break user relationships
    }

    toast.success("All data has been reset. Reloading page...");
    
    // Give the toast a moment to appear before reloading
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error resetting data:", error);
    toast.error("Failed to reset all data. See console for details.");
  }
};
