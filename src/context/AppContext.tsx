import React, { createContext, useContext, useEffect, useState } from "react";
import { ProductSheet, Question, Tag, User, Subsection, Comment, SupplierResponse, PIR } from "../types";
import { toast } from "sonner";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useQuestionBank, DBQuestion } from "@/hooks/use-question-bank";
import { useTags, DBTag } from "@/hooks/use-tags";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { Comment as DBComment } from '@supabase/supabase-js';

// Define Company interface
interface Company {
  id: string;
  name: string;
  email?: string;
  contact_email?: string;
  contact_name?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  progress?: number;
  description?: string;
}

// Update Comment interface to match requirements
interface LocalComment {
  id: string;
  text: string;
  answerId: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  userId: string;
}

// Update Answer interface to match SupplierResponse
interface Answer {
  id: string;
  questionId: string;
  value: string | number | boolean | string[];
  comments: LocalComment[];
  status: "pending" | "approved" | "rejected";
  flags?: any[];
  created_at?: Date;
  updated_at?: Date;
}

// Define missing types
type QuestionCategory = {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  order?: number;
};

type QuestionSection = {
  id: string;
  name: string;
  description: string | null;
  parent_section_id?: string | null;
  order?: number;
};

// Define missing category management functions
const addCategory = async (data: { 
  name: string; 
  description: string | null; 
  parent_id: string | null;
  order?: number;
}) => {
  const { data: newCategory, error } = await supabase
    .from('question_sections')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return newCategory;
};

const updateCategory = async (id: string, data: {
  name: string;
  description: string | null;
  order?: number;
}) => {
  const { error } = await supabase
    .from('question_sections')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
};

const deleteCategory = async (id: string) => {
  const { error } = await supabase
    .from('question_sections')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Update Section interface to include database fields
interface Section {
  id: string;
  name: string;
  description: string;
  dbId?: string;
  order?: number;
  parent_section_id?: string | null;
}

// Add QuestionType enum
type QuestionType = 
  | 'text'
  | 'number'
  | 'boolean'
  | 'single_choice'
  | 'multiple_choice'
  | 'file_upload';

// Update User type to include metadata
interface ExtendedUser extends User {
  user_metadata?: {
    name?: string;
  };
}

interface AppContextType {
  user: ExtendedUser | null;
  setUser: React.Dispatch<React.SetStateAction<ExtendedUser | null>>;
  companies: Company[];
  addCompany: (company: {
    name: string;
    email?: string;
    website?: string;
    description?: string;
  }) => void;
  updateCompany: (company: Company) => void;
  deleteCompany: (id: string) => void;
  productSheets: ProductSheet[];
  addProductSheet: (productSheet: Omit<ProductSheet, "id" | "createdAt" | "updatedAt" | "answers">) => void;
  updateProductSheet: (productSheet: ProductSheet) => void;
  deleteProductSheet: (id: string) => void;
  questions: Question[];
  addQuestion: (question: Omit<Question, "id">) => void;
  updateQuestion: (question: Question) => void;
  deleteQuestion: (id: string) => void;
  tags: Tag[];
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTag: (tag: Tag) => void;
  deleteTag: (id: string) => void;
  sections: Section[];
  addSection: (section: Omit<Section, "id">) => void;
  updateSection: (section: Section) => void;
  deleteSection: (id: string) => void;
  subsections: Subsection[];
  addSubsection: (subsection: Omit<Subsection, "id">) => void;
  updateSubsection: (subsection: Subsection) => void;
  deleteSubsection: (id: string) => void;
  addComment: (sheetId: string, questionId: string, text: string) => void;
  updateSupplierResponse: (sheetId: string, questionId: string, value: string | number | boolean | string[]) => void;
  
  // Database-driven properties from hooks
  dbQuestions: DBQuestion[];
  dbCategories: QuestionCategory[];
  questionBankLoading: boolean;
  refreshQuestions: () => Promise<void>;
  refreshSections: () => Promise<void>;
  syncLocalSectionsToDatabase: () => Promise<void>;
  initializeDatabase: () => Promise<void>;
  isInitializing: boolean;
  
  // Database tag properties
  dbTags: DBTag[];
  tagsLoading: boolean;
  refreshTags: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  
  // State tracking
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Local state (will eventually be removed or used only as cache)
  const [user, setUser] = usePersistedState<ExtendedUser | null>("current-user", null);
  const [companies, setCompanies] = usePersistedState<Company[]>("companies", []);
  const [productSheets, setProductSheets] = usePersistedState<ProductSheet[]>("productSheets", []);
  const [questions, setQuestions] = usePersistedState<Question[]>("questions", []);
  const [tags, setTags] = usePersistedState<Tag[]>("tags", []);
  const [sections, setSections] = usePersistedState<Section[]>("sections", []);
  const [subsections, setSubsections] = usePersistedState<Subsection[]>("subsections", []);

  // Move dbSections declaration to the top
  const [dbSections, setDbSections] = useState<QuestionSection[]>([]);
  const [dbQuestions, setDbQuestions] = useState<DBQuestion[]>([]);
  const [dbCategories, setDbCategories] = useState<QuestionCategory[]>([]);
  const [localTags, setLocalTags] = useState<any[]>([]);
  
  // Loading states
  const [questionBankLoading, setQuestionBankLoading] = useState(false);
  const [localTagsLoading, setLocalTagsLoading] = useState(false);
  
  // Data hooks
  const { 
    questions: hkQuestions, 
    sections: hkSections,
    loading: hkLoading, 
    error: hkError,
    loadQuestions: hkLoadQuestions,
    loadSections: hkLoadSections,
    addQuestion: hkAddQuestion,
    updateQuestion: hkUpdateQuestion,
    deleteQuestion: hkDeleteQuestion,
    addSection: hkAddSection,
    updateSection: hkUpdateSection,
    deleteSection: hkDeleteSection,
  } = useQuestionBank();
  
  // Use our database tags hook
  const {
    tags: dbTags,
    loading: tagsLoading,
    loadTags,
    addTag: addDBTag,
    updateTag: updateDBTag,
    deleteTag: deleteDBTag,
    addTagToQuestion,
    removeTagFromQuestion,
    getQuestionTags
  } = useTags();

  // Initialize the app with fresh database data
  const initializeDatabase = async (): Promise<void> => {
    setIsInitializing(true);
    try {
      // Clear any local storage data if needed
      // localStorage.clear(); // Commented out to avoid clearing auth tokens
      
      // Reset local state
      setSections([]);
      setSubsections([]);
      setQuestions([]);
      setTags([]);
      
      // Load fresh data from the database
      try {
        await Promise.all([
          hkLoadQuestions(),
          hkLoadSections(),
          loadTags()
        ]);
      } catch (err) {
        console.error("Error loading initial data:", err);
        // Try direct database queries as fallback
        const { data: tagsData } = await supabase.from('tags').select('*');
        if (tagsData && tagsData.length > 0) {
          console.log("Loaded tags directly:", tagsData.length);
          
          // Convert database tags to local tags format
          const localTags: Tag[] = tagsData.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            description: tag.description || undefined
          }));
          
          // Set the converted local tags
          setTags(localTags);
        }
      }
      
      // Convert database categories to local sections format
      const dbSections: Section[] = hkSections
        .filter(cat => !cat.parent_section_id) // Only parent categories
        .map((cat, index) => ({
          id: `db-section-${cat.id}`,
          name: cat.name,
          description: cat.description || '',
          dbId: cat.id,
          order: cat.order || index + 1 // Use index+1 as fallback if order is not set
        }));
      
      // Convert database categories to local subsections format
      const dbSubsections: Subsection[] = hkSections
        .filter(cat => cat.parent_section_id) // Only child categories
        .map((cat, index) => {
          // Find the parent section
          const parentSection = dbSections.find(s => s.dbId === cat.parent_section_id);
          
          return {
            id: `db-subsection-${cat.id}`,
            name: cat.name,
            description: cat.description || '',
            sectionId: parentSection?.id || '',
            dbId: cat.id,
            order: cat.order || index + 1 // Use index+1 as fallback if order is not set
          };
        });
      
      // Set the converted local state
      setSections(dbSections);
      setSubsections(dbSubsections);
      
      // Convert database tags to local tags format
      const localTags: Tag[] = dbTags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description || undefined
      }));
      
      // Set the converted local tags
      setTags(localTags);
      
      toast.success("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      toast.error("Failed to initialize database");
    } finally {
      setIsInitializing(false);
    }
  };

  // Exposed refresh methods
  const refreshQuestions = async () => {
    await hkLoadQuestions();
  };

  const refreshSections = async () => {
    console.log("Refreshing sections from database...");
    try {
      // First try to load using the hook
      await hkLoadSections();
      
      // Try to load emergency sections if they exist
      const emergencySections = localStorage.getItem('emergency-sections');
      const emergencySubsections = localStorage.getItem('emergency-subsections');
      
      if (emergencySections && emergencySubsections) {
        console.log("Found emergency sections data in localStorage");
        try {
          const parsedSections = JSON.parse(emergencySections);
          const parsedSubsections = JSON.parse(emergencySubsections);
          
          if (Array.isArray(parsedSections) && parsedSections.length > 0) {
            setSections(parsedSections);
            console.log("Applied emergency sections:", parsedSections.length);
          }
          
          if (Array.isArray(parsedSubsections) && parsedSubsections.length > 0) {
            setSubsections(parsedSubsections);
            console.log("Applied emergency subsections:", parsedSubsections.length);
          }
          
          // Clear emergency data after applying
          localStorage.removeItem('emergency-sections');
          localStorage.removeItem('emergency-subsections');
          
          return;
        } catch (err) {
          console.error("Error parsing emergency sections:", err);
        }
      }
      
      // Check if we got any sections back
      if (dbSections.length === 0) {
        console.log("No sections returned from hook, trying direct query...");
        // Try direct database query as fallback
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('question_sections')
          .select('*');
        
        if (sectionsError) {
          console.error("Error in direct sections query:", sectionsError);
          throw sectionsError;
        }
        
        if (sectionsData && sectionsData.length > 0) {
          console.log("Found sections with direct query:", sectionsData.length);
          
          // Convert to section format
          const dbSections = sectionsData
            .filter((sec: any) => !sec.parent_section_id)
            .map((sec: any, index: number) => ({
              id: `db-section-${sec.id}`,
              name: sec.name,
              description: sec.description || '',
              dbId: sec.id,
              order: sec.order || index + 1 // Use index+1 as fallback if order is not set
            }));
          
          // Convert to subsection format
          const dbSubsections = sectionsData
            .filter((sec: any) => sec.parent_section_id)
            .map((sec: any, index: number) => {
              // Find parent section 
              const parentSection = dbSections.find(s => s.dbId === sec.parent_section_id);
              
              return {
                id: `db-subsection-${sec.id}`,
                name: sec.name,
                description: sec.description || '',
                sectionId: parentSection ? parentSection.id : '',
                dbId: sec.id,
                order: sec.order || index + 1 // Use index+1 as fallback if order is not set
              };
            });
          
          // Update the local state directly
          console.log("Setting sections directly from database query:", dbSections.length);
          setSections(dbSections);
          setSubsections(dbSubsections);
          return;
        }
      }
      
      // Convert database sections to local sections format
      const dbSections: Section[] = dbSections
        .filter(sec => !sec.parent_section_id) // Only parent sections
        .map((sec, index) => ({
          id: `db-section-${sec.id}`,
          name: sec.name,
          description: sec.description || '',
          dbId: sec.id,
          order: sec.order || index + 1 // Use index+1 as fallback if order is not set
        }));
      
      // Convert database sections to local subsections format
      const dbSubsections: Subsection[] = dbSections
        .filter(sec => sec.parent_section_id) // Only child sections
        .map((sec, index) => {
          // Find the parent section
          const parentSection = dbSections.find(s => s.dbId === sec.parent_section_id);
          
          return {
            id: `db-subsection-${sec.id}`,
            name: sec.name,
            description: sec.description || '',
            sectionId: parentSection ? parentSection.id : '',
            dbId: sec.id,
            order: sec.order || index + 1 // Use index+1 as fallback if order is not set
          };
        });
      
      // If we have converted sections from the database, use them
      if (dbSections.length > 0) {
        console.log("Setting sections from dbSections:", dbSections.length);
        setSections(dbSections);
        setSubsections(dbSubsections);
        return;
      }
      
      // Continue with existing functionality to update local data with DB links
      console.log("Sections loaded from hook:", dbSections.length);
      
      // After loading sections from DB, update local sections with DB IDs
      const updatedSections = sections.map(section => {
        // Try to find matching section in dbSections
        const matchingSection = dbSections.find(
          sec => sec.name.toLowerCase() === section.name.toLowerCase() && !sec.parent_section_id
        );
        
        if (matchingSection && !section.dbId) {
          // Found a match, update the local section with the DB ID
          return {
            ...section,
            dbId: matchingSection.id
          };
        }
        
        return section;
      });
      
      // Update local sections with linked DB IDs
      setSections(updatedSections);
      
      // Do the same for subsections
      const updatedSubsections = subsections.map(subsection => {
        // Try to find parent section with dbId
        const parentSection = updatedSections.find(s => s.id === subsection.sectionId);
        
        if (parentSection?.dbId) {
          // Try to find matching section in dbSections
          const matchingSubsection = dbSections.find(
            sec => sec.name.toLowerCase() === subsection.name.toLowerCase() && sec.parent_section_id === parentSection.dbId
          );
          
          if (matchingSubsection && !subsection.dbId) {
            // Found a match, update the local subsection with the DB ID
            return {
              ...subsection,
              dbId: matchingSubsection.id
            };
          }
        }
        
        return subsection;
      });
      
      // Update local subsections with linked DB IDs
      setSubsections(updatedSubsections);
    } catch (err) {
      console.error("Error refreshing sections:", err);
      toast.error("Failed to refresh sections");
    }
  };

  const refreshTags = async () => {
    console.log("Refreshing tags from database...");
    try {
      // First try to load from database using the hook
      await loadTags();
      
      // As a fallback, try direct database query if the hook returned no tags
      if (dbTags.length === 0) {
        console.log("No tags returned from hook, trying direct query...");
        const { data, error } = await supabase.from('tags').select('*');
        
        if (error) {
          console.error("Error in direct tags query:", error);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log("Found tags with direct query:", data.length);
          // Manually update the local tags array
          const localTags: Tag[] = data.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            description: tag.description || undefined
          }));
          
          setTags(localTags);
        }
      } else {
        console.log("Tags loaded from hook:", dbTags.length);
        // After loading tags from DB, update local tags
        const localTags: Tag[] = dbTags.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          description: tag.description || undefined
        }));
        
        // Set the converted local tags
        setTags(localTags);
      }
    } catch (err) {
      console.error("Error refreshing tags:", err);
      toast.error("Failed to refresh tags");
    }
  };

  // Function to migrate local sections to database
  const syncLocalSectionsToDatabase = async (): Promise<void> => {
    let hasChanges = false;
    
    // First sync sections (parent categories)
    const updatedSections = [...sections];
    for (let i = 0; i < updatedSections.length; i++) {
      const section = updatedSections[i];
      if (!section.dbId) {
        try {
          // Add to database
          const newCategory = await addCategory({
            name: section.name,
            description: section.description || null,
            parent_id: null,
          });
          
          if (newCategory) {
            // Update local section with DB ID
            updatedSections[i] = {
              ...section,
              dbId: newCategory.id
            };
            hasChanges = true;
          }
        } catch (err) {
          console.error("Failed to sync section to database:", section.name, err);
        }
      }
    }
    
    // Then sync subsections (child categories)
    const updatedSubsections = [...subsections];
    for (let i = 0; i < updatedSubsections.length; i++) {
      const subsection = updatedSubsections[i];
      // Find parent section
      const parentSection = updatedSections.find(s => s.id === subsection.sectionId);
      
      if (parentSection?.dbId && !subsection.dbId) {
        try {
          // Add to database as a child category
          const newCategory = await addCategory({
            name: subsection.name,
            description: subsection.description || null,
            parent_id: parentSection.dbId,
          });
          
          if (newCategory) {
            // Update local subsection with DB ID
            updatedSubsections[i] = {
              ...subsection,
              dbId: newCategory.id
            };
            hasChanges = true;
          }
        } catch (err) {
          console.error("Failed to sync subsection to database:", subsection.name, err);
        }
      }
    }
    
    // Update state if we made changes
    if (hasChanges) {
      setSections(updatedSections);
      setSubsections(updatedSubsections);
      toast.success("Synchronized sections with database");
    }
  };

  // Function to add a company
  const addCompany = async (company: {
    name: string;
    email?: string;
    website?: string;
    description?: string;
  }) => {
    // First try to add to the database
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          contact_email: company.email || null,
          website: company.website || null,
          description: company.description || null,
          created_by: authUser?.id
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Create a local company object from the DB response
      const newCompany: Company = {
        id: data.id,
        name: data.name,
        email: data.contact_email || '',
        website: data.website || '',
        description: data.description || '',
        progress: 0,
        // Map other fields as needed
      };
      
      // Update local state
      setCompanies([...companies, newCompany]);
      toast.success("Company added successfully");
      return newCompany;
    } catch (err) {
      console.error("Failed to add company to database:", err);
      toast.error("Failed to add company");
      
      // Fallback to local state only if needed
    const newCompany: Company = {
      ...company,
        id: `c${Date.now()}`,
      progress: 0,
    };
    setCompanies([...companies, newCompany]);
      return newCompany;
    }
  };

  // Update company function (should update database)
  const updateCompany = (company: Company) => {
    setCompanies(companies.map((c) => (c.id === company.id ? company : c)));
    toast.success("Company updated successfully");
  };

  // Delete company function (should delete from database)
  const deleteCompany = (id: string) => {
    setCompanies(companies.filter((c) => c.id !== id));
    toast.success("Company deleted successfully");
  };

  const addProductSheet = (productSheet: Omit<ProductSheet, "id" | "createdAt" | "updatedAt" | "answers">) => {
    const newProductSheet: ProductSheet = {
      ...productSheet,
      id: `ps${productSheets.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      answers: [],
    };
    setProductSheets([...productSheets, newProductSheet]);
    toast.success("Product sheet added successfully");
  };

  const updateProductSheet = (productSheet: ProductSheet) => {
    setProductSheets(productSheets.map((ps) => (ps.id === productSheet.id ? productSheet : ps)));
    toast.success("Product sheet updated successfully");
  };

  const deleteProductSheet = (id: string) => {
    setProductSheets(productSheets.filter((ps) => ps.id !== id));
    toast.success("Product sheet deleted successfully");
  };

  // Helper function to extract UUID from ID strings like "db-section-uuid"
  const extractUUID = (id: string | undefined): string | undefined => {
    if (!id) return undefined;
    
    // Extract UUID pattern from the string
    const uuidMatch = id.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return uuidMatch ? uuidMatch[1] : id;
  };

  // Update addQuestion to handle tags correctly
  const addQuestion = async (question: Omit<Question, "id">) => {
    // Create the question in local state
    const newQuestion: Question = {
      ...question,
      id: `q${questions.length + 1}`,
    };
    setQuestions([...questions, newQuestion]);
    
    // Also add to database if possible
    try {
      // First add the question to get the ID
      const dbQuestion = await hkAddQuestion({
        title: newQuestion.text,
        description: newQuestion.description || null,
        category_id: extractUUID(newQuestion.subsectionId) || extractUUID(newQuestion.sectionId) || '1',
        type: convertQuestionType(newQuestion.type || 'text'),
        is_required: newQuestion.required || false,
        options: Array.isArray(newQuestion.options) && newQuestion.options.length > 0 ? 
          JSON.stringify(newQuestion.options) : null,
        validation_rules: null,
        tags: []  // Handle tags separately after question creation
      });
      
      if (dbQuestion && newQuestion.tags && newQuestion.tags.length > 0) {
        const dbQuestionId = dbQuestion.id;
        setQuestions(prev => prev.map(q => 
          q.id === newQuestion.id ? { ...q, dbId: dbQuestionId } : q
        ));
        
        for (const tag of newQuestion.tags) {
          if (tag.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            try {
              await supabase.from('question_tags')
                .insert({
                  question_id: dbQuestionId,
                  tag_id: tag.id
                });
            } catch (err) {
              console.error(`Failed to associate tag ${tag.id} with question ${dbQuestionId}`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to add question to database", err);
    }
    
    toast.success("Question added successfully");
    return newQuestion;
  };

  const updateQuestion = async (question: Question) => {
    // Update in local state
    setQuestions(questions.map((q) => (q.id === question.id ? question : q)));
    
    // Try to update in database if it exists
    if (question.dbId) {
      try {
        // First update the base question
        await hkUpdateQuestion(question.dbId, {
          title: question.text,
          description: question.description || null,
          category_id: extractUUID(question.subsectionId) || extractUUID(question.sectionId) || null,
          type: convertQuestionType(question.type),
          is_required: question.required,
          options: Array.isArray(question.options) && question.options.length > 0 ? 
            JSON.stringify(question.options) : null,
        });
        
        // Now handle tags - first remove all existing tags
        await supabase.from('question_tags')
          .delete()
          .eq('question_id', question.dbId);
        
        // Then add all the current tags
        if (question.tags && question.tags.length > 0) {
          for (const tag of question.tags) {
            // Only process tags with database IDs (not local-only tags)
            if (tag.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              try {
                await supabase.from('question_tags')
                  .insert({
                    question_id: question.dbId,
                    tag_id: tag.id
                  });
              } catch (err) {
                console.error(`Failed to associate tag ${tag.id} with question ${question.dbId}`, err);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to update question in database", err);
      }
    }
    
    toast.success("Question updated successfully");
  };

  // Helper function to convert frontend question type to DB question type
  const convertQuestionType = (frontendType: string): QuestionType => {
    switch (frontendType) {
      case 'text':
        return 'text';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'select':
        return 'single_choice';
      case 'multi-select':
        return 'multiple_choice';
      case 'file':
        return 'file_upload';
      default:
        return 'text';
    }
  };

  const deleteQuestion = async (id: string) => {
    const questionToDelete = questions.find(q => q.id === id);
    setQuestions(questions.filter((q) => q.id !== id));
    
    // Delete from database if it has a dbId
    if (questionToDelete?.dbId) {
      try {
        await hkDeleteQuestion(questionToDelete.dbId);
      } catch (err) {
        console.error("Failed to delete question from database", err);
      }
    }
    
    toast.success("Question deleted successfully");
  };

  const addTag = async (tag: Omit<Tag, "id">) => {
    try {
      // Add to database, without trying to create a profile
      const newDBTag = await addDBTag({
        name: tag.name,
        color: tag.color,
        description: tag.description || null
      });
      
      if (newDBTag) {
        // Create tag with database ID
        const newTag: Tag = {
          id: newDBTag.id,
          name: newDBTag.name,
          color: newDBTag.color,
          description: newDBTag.description || undefined
        };
        
        // Add to local state
        setTags([...tags, newTag]);
        toast.success("Information category added successfully");
        return newTag;
      } else {
        // Create a local tag if database fails
        const newTag: Tag = {
          ...tag,
          id: `tag${tags.length + 1}`,
        };
        setTags([...tags, newTag]);
        toast.success("Information category added (locally only)");
        return newTag;
      }
    } catch (err) {
      console.error("Failed to add tag to database", err);
      
      // Create a local-only tag as fallback
    const newTag: Tag = {
      ...tag,
      id: `tag${tags.length + 1}`,
    };
    setTags([...tags, newTag]);
      toast.success("Information category added (locally only)");
      return newTag;
    }
  };

  const updateTag = async (tag: Tag) => {
    // Update in local state
    setTags(tags.map((t) => (t.id === tag.id ? tag : t)));
    
    // Check if this is a database tag (UUID format)
    if (tag.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        // Update in database
        await updateDBTag(tag.id, {
          name: tag.name,
          color: tag.color,
          description: tag.description || null
        });
      } catch (err) {
        console.error("Failed to update tag in database", err);
      }
    }
    
    toast.success("Information category updated successfully");
  };

  const deleteTag = async (id: string) => {
    // Remove from local state
    setTags(tags.filter((t) => t.id !== id));
    
    // Check if this is a database tag (UUID format)
    if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        // Delete from database
        await deleteDBTag(id);
      } catch (err) {
        console.error("Failed to delete tag from database", err);
      }
    }
    
    toast.success("Information category deleted successfully");
  };

  const addSection = async (section: Omit<Section, "id">) => {
    // Calculate the next order number
    const nextOrder = sections.length > 0 
      ? Math.max(...sections.map(s => s.order || 0)) + 1 
      : 1;
    
    // First add to database
    try {
      const newCategory = await addCategory({
        name: section.name,
        description: section.description || null,
        parent_id: null,
        order: nextOrder,
      });
      
      if (newCategory) {
        // Create section with database ID and order
    const newSection: Section = {
      ...section,
          id: `db-section-${newCategory.id}`,
          dbId: newCategory.id,
          order: nextOrder
    };
        
        // Add to local state
    setSections([...sections, newSection]);
    toast.success("Section added successfully");
        return newSection;
      } else {
        throw new Error("Failed to create category in database");
      }
    } catch (err) {
      console.error("Failed to add section to database", err);
      toast.error("Failed to add section");
      
      // Fallback to local only
      const newSection: Section = {
        ...section,
        id: `section${Date.now()}`,
        order: nextOrder
      };
      setSections([...sections, newSection]);
      return newSection;
    }
  };

  const updateSection = async (section: Section) => {
    setSections(sections.map((s) => (s.id === section.id ? section : s)));
    
    // Update in database if it has a dbId
    if (section.dbId) {
      try {
        await updateCategory(section.dbId, {
          name: section.name,
          description: section.description || null,
        });
      } catch (err) {
        console.error("Failed to update section in database", err);
      }
    }
    
    toast.success("Section updated successfully");
  };

  const deleteSection = async (id: string) => {
    const sectionToDelete = sections.find(s => s.id === id);
    setSections(sections.filter((s) => s.id !== id));
    
    // Remove associated subsections
    const subsectionsToKeep = subsections.filter((ss) => ss.sectionId !== id);
    setSubsections(subsectionsToKeep);
    
    // Update questions that reference this section
    const questionsToUpdate = questions.filter((q) => q.sectionId === id);
    questionsToUpdate.forEach((q) => {
      q.sectionId = ""; // Clear the section ID
      updateQuestion(q);
    });
    
    // Delete from database if it has a dbId
    if (sectionToDelete?.dbId) {
      try {
        await deleteCategory(sectionToDelete.dbId);
      } catch (err) {
        console.error("Failed to delete section from database", err);
      }
    }
    
    toast.success("Section deleted successfully");
  };

  const addSubsection = async (subsection: Omit<Subsection, "id">) => {
    // Find the parent section to get its dbId
    const parentSection = sections.find(s => s.id === subsection.sectionId);
    
    // Calculate the next order number within this section
    const nextOrder = subsections
      .filter(ss => ss.sectionId === subsection.sectionId)
      .length > 0
        ? Math.max(...subsections
            .filter(ss => ss.sectionId === subsection.sectionId)
            .map(ss => ss.order || 0)) + 1
        : 1;
    
    if (parentSection?.dbId) {
      // Add to database
      try {
        const newCategory = await addCategory({
          name: subsection.name,
          description: subsection.description || null,
          parent_id: parentSection.dbId,
          order: nextOrder,
        });
        
        if (newCategory) {
          // Create subsection with database ID
          const newSubsection: Subsection = {
            ...subsection,
            id: `db-subsection-${newCategory.id}`,
            dbId: newCategory.id,
            order: nextOrder
          };
          
          // Add to local state
          setSubsections([...subsections, newSubsection]);
          toast.success("Subsection added successfully");
          return newSubsection;
        } else {
          throw new Error("Failed to create subcategory in database");
        }
      } catch (err) {
        console.error("Failed to add subsection to database", err);
        toast.error("Failed to add subsection");
      }
    }
    
    // Fallback to local only
    const newSubsection: Subsection = {
      ...subsection,
      id: `subsection${Date.now()}`,
      order: nextOrder
    };
    setSubsections([...subsections, newSubsection]);
    return newSubsection;
  };

  const updateSubsection = async (subsection: Subsection) => {
    setSubsections(subsections.map((ss) => (ss.id === subsection.id ? subsection : ss)));
    
    // Update in database if it has a dbId
    if (subsection.dbId) {
      try {
        await updateCategory(subsection.dbId, {
          name: subsection.name,
          description: subsection.description || null,
        });
      } catch (err) {
        console.error("Failed to update subsection in database", err);
      }
    }
    
    toast.success("Subsection updated successfully");
  };

  const deleteSubsection = async (id: string) => {
    const subsectionToDelete = subsections.find(ss => ss.id === id);
    setSubsections(subsections.filter((ss) => ss.id !== id));
    
    // Delete from database if it has a dbId
    if (subsectionToDelete?.dbId) {
      try {
        await deleteCategory(subsectionToDelete.dbId);
      } catch (err) {
        console.error("Failed to delete subsection from database", err);
      }
    }
    
    toast.success("Subsection deleted successfully");
  };

  // Update addComment to use ExtendedUser type
  const addComment = (sheetId: string, questionId: string, text: string) => {
    const sheet = productSheets.find((ps) => ps.id === sheetId);
    if (!sheet) return;

    const answer = sheet.answers.find((a) => a.questionId === questionId);
    if (!answer) return;

    const newComment: LocalComment = {
      id: `comment${Date.now()}`,
      text,
      answerId: answer.id,
      createdBy: user?.id || '',
      createdByName: user?.user_metadata?.name || user?.email || '',
      createdAt: new Date(),
      userId: user?.id || ''
    };

    const updatedAnswers = sheet.answers.map((a) =>
      a.questionId === questionId
        ? {
            ...a,
            comments: [...a.comments, newComment],
          }
        : a
    );

    const updatedSheet = {
      ...sheet,
      answers: updatedAnswers,
      updated_at: new Date(),
    };

    setProductSheets(productSheets.map((ps) => (ps.id === sheetId ? updatedSheet : ps)));
    toast.success("Comment added successfully");
  };

  // Update updateSupplierResponse to handle Answer type correctly
  const updateSupplierResponse = (sheetId: string, questionId: string, value: string | number | boolean | string[]) => {
    const sheet = productSheets.find((ps) => ps.id === sheetId);
    if (!sheet) return;

    const answer = sheet.answers.find((a) => a.questionId === questionId);
    if (answer) {
      // Update existing answer
      const updatedAnswers = sheet.answers.map((a) =>
        a.questionId === questionId
          ? {
              ...a,
              value,
              updated_at: new Date(),
            }
          : a
      );
      const updatedSheet = {
        ...sheet,
        answers: updatedAnswers as Answer[],
        updated_at: new Date(),
      };
      setProductSheets(productSheets.map((ps) => (ps.id === sheetId ? updatedSheet : ps)));
    } else {
      // Create new answer
      const newAnswer: Answer = {
        id: `answer${Date.now()}`,
        questionId,
        value,
        status: "pending",
        comments: [],
        flags: [],
      };
      const updatedSheet = {
        ...sheet,
        answers: [...sheet.answers, newAnswer],
        updated_at: new Date(),
      };
      setProductSheets(productSheets.map((ps) => (ps.id === sheetId ? updatedSheet : ps)));
    }

    toast.success("Response updated successfully");
  };

  // Initialize database on first load when user is available
  useEffect(() => {
    if (authUser && !isInitializing && hkSections.length === 0) {
      // Auto-initialize on first load
      initializeDatabase();
    }
  }, [authUser, hkSections.length]);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        companies,
        addCompany,
        updateCompany,
        deleteCompany,
        productSheets,
        addProductSheet,
        updateProductSheet,
        deleteProductSheet,
        questions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        tags,
        addTag,
        updateTag,
        deleteTag,
        sections,
        addSection,
        updateSection,
        deleteSection,
        subsections,
        addSubsection,
        updateSubsection,
        deleteSubsection,
        addComment,
        updateSupplierResponse,
        dbQuestions,
        dbCategories,
        questionBankLoading,
        refreshQuestions,
        refreshSections,
        refreshTags,
        syncLocalSectionsToDatabase,
        initializeDatabase,
        isInitializing,
        dbTags,
        tagsLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
