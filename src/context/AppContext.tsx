import React, { createContext, useContext, useState } from "react";
// Removed unused types: ProductSheet, Question, Tag, Subsection, Comment, SupplierResponse, PIR, QuestionCategory, QuestionSection, Section, DBQuestion, DBTag
import { User } from "../types"; // Keep User type if needed for mock user
import { toast } from "sonner";
import { usePersistedState } from "@/hooks/use-persisted-state";
// Removed unused hooks: useQuestionBank, useTags
// import { useQuestionBank, DBQuestion } from "@/hooks/use-question-bank";
// import { useTags, DBTag } from "@/hooks/use-tags";
// Removed unused imports: supabase, useAuth, DBComment
// import { supabase } from "@/integrations/supabase/client";
// import { useAuth } from "./AuthContext";
// import { Comment as DBComment } from '@supabase/supabase-js';

// Removed unused Company interface definition

// Removed unused LocalComment interface definition

// Removed unused Answer interface definition

// Removed unused category management functions (addCategory, updateCategory, deleteCategory)

// Removed unused QuestionType enum

// Update User type if needed, or rely on the one from '@/types'
interface ExtendedUser extends User {
  user_metadata?: {
    name?: string;
  };
}

// Simplified AppContextType - only includes mock user state for now
interface AppContextType {
  user: ExtendedUser | null; // Mock user state
  setUser: React.Dispatch<React.SetStateAction<ExtendedUser | null>>;
  // Removed all properties related to companies, productSheets, questions, tags, sections, subsections, comments, responses, db data, etc.
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // const { user: authUser } = useAuth(); // Removed authUser dependency

  // Keep mock user state if still needed for UserSwitcher functionality
  const [user, setUser] = usePersistedState<ExtendedUser | null>("current-user", null);

  // Removed all other persisted state declarations:
  // const [companies, setCompanies] = usePersistedState<Company[]>("companies", []);
  // const [productSheets, setProductSheets] = usePersistedState<ProductSheet[]>("productSheets", []);
  // const [questions, setQuestions] = usePersistedState<Question[]>("questions", []);
  // const [tags, setTags] = usePersistedState<Tag[]>("tags", []);
  // const [sections, setSections] = usePersistedState<Section[]>("sections", []);
  // const [subsections, setSubsections] = usePersistedState<Subsection[]>("subsections", []);

  // Removed state related to db data from hooks
  // const [dbSections, setDbSections] = useState<QuestionSection[]>([]);
  // const [dbQuestions, setDbQuestions] = useState<DBQuestion[]>([]);
  // ... etc ...

  // Removed loading states related to hooks
  // const [questionBankLoading, setQuestionBankLoading] = useState(false);
  // const [localTagsLoading, setLocalTagsLoading] = useState(false);
  // const [isInitializing, setIsInitializing] = useState(false);

  // Removed usage of useQuestionBank and useTags hooks
  // const { ... } = useQuestionBank();
  // const { ... } = useTags();

  // Removed all manual add/update/delete functions for local state
  // const addCompany = (...) => { ... };
  // const updateCompany = (...) => { ... };
  // ... etc for productSheets, questions, tags, sections, subsections, comments, responses ...

  // Removed database interaction functions like initializeDatabase, refreshQuestions, etc.
  // const initializeDatabase = async (): Promise<void> => { ... };
  // const refreshQuestions = async () => { ... };
  // const refreshSections = async () => { ... };
  // const syncLocalSectionsToDatabase = async () => { ... };


  // Simplified context value
  const contextValue: AppContextType = {
    user, // Mock user
    setUser, // Mock user setter
    // All other properties removed
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the AppContext
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
