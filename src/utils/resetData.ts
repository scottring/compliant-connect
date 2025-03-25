
import { toast } from "sonner";

/**
 * Resets all application data stored in localStorage
 * This will clear all companies, product sheets, questions, etc.
 */
export const resetAllData = () => {
  // List of all localStorage keys used by the app
  const appDataKeys = [
    "current-user",
    "companies",
    "product-sheets",
    "questions",
    "tags",
    "sections",
    "subsections"
  ];

  // Remove each key from localStorage
  appDataKeys.forEach(key => {
    localStorage.removeItem(key);
  });

  // Reload the page to apply changes
  toast.success("All data has been reset. Reloading page...");
  
  // Give the toast a moment to appear before reloading
  setTimeout(() => {
    window.location.reload();
  }, 1500);
};
