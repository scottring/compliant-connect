
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
      // Call the database function to reset data securely
      const { error: rpcError } = await supabase.rpc('reset_application_data');

      if (rpcError) {
        console.error("Error calling reset_application_data RPC:", rpcError);
        toast.error("Failed to reset Supabase data. Check console for details.");
        return; // Stop execution if RPC fails
      }
    } else {
      // If not authenticated, we can only clear local storage
      toast.info("Local data cleared. Log in to reset database data.");
    }

    toast.success("Application data reset successfully. Reloading page...");
    
    // Give the toast a moment to appear before reloading
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error resetting data:", error);
    toast.error("Failed to reset all data. See console for details.");
  }
};
