import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Correct import path
import { useAuth } from '@/context/AuthContext';
import { Question, Tag, Section, Subsection } from '@/types'; // Assuming Question here is the UI type, not DB type
import { toast } from 'sonner';

// Type for Sections/Subsections loaded from DB (assuming sections table holds both)
export type QuestionSection = {
  id: string;
  name: string;
  description: string | null;
  parent_section_id: string | null; // Use this to differentiate sections/subsections if needed
  created_at: string;
  updated_at: string;
  order_index?: number | null; // Corrected column name from schema
};

export type QuestionType = 'text' | 'number' | 'boolean' | 'single_choice' | 'multiple_choice' | 'file_upload' | 'select' | 'multi-select' | 'table'; // Added types from dialog

// DB Question type matching schema
export type DBQuestion = {
  id: string;
  subsection_id: string; // Corrected column name from schema
  text: string; // Renamed from 'title' to match schema
  description: string | null;
  type: QuestionType;
  required: boolean; // Renamed from 'is_required' to match schema
  options: any | null; // Keep as any for flexibility, matches schema
  // validation_rules: any | null; // Column doesn't exist in schema
  created_by: string; // Column doesn't exist in schema, but useful for RLS potentially
  created_at: string;
  updated_at: string;
  tags?: Tag[]; // Keep for UI state, but not directly in DB table
};

// Input type for creating/updating questions (maps UI state to DB structure)
export type QuestionInputData = {
  text: string;
  description?: string | null;
  required: boolean;
  type: QuestionType;
  tags: Tag[]; // Array of selected Tag objects
  options?: string[] | null;
  subsection_id: string; // Need subsection ID to create/update
  // Add other fields as needed based on UI/DB
};


interface QuestionTagJoin {
  question_id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    // color: string; // Removed color
    description: string | null;
  };
}

// Define the return type for the hook explicitly
export interface UseQuestionBankReturn {
  questions: DBQuestion[];
  sections: QuestionSection[]; // Use the correct type
  tags: Tag[]; // Add tags state
  loading: boolean;
  error: string | null;
  loadQuestions: () => Promise<void>;
  loadSections: () => Promise<void>;
  loadTags: () => Promise<void>; // Add function to load tags
  addQuestion: (question: QuestionInputData) => Promise<DBQuestion | null>; // Use input type
  updateQuestion: (id: string, updates: Partial<QuestionInputData>) => Promise<DBQuestion | null>; // Use input type
  deleteQuestion: (id: string) => Promise<boolean>;
  addSection: (section: Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>) => Promise<QuestionSection | null>;
  updateSection: (id: string, updates: Partial<Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>>) => Promise<QuestionSection | null>;
  deleteSection: (id: string) => Promise<boolean>;
  // Update createTag input type to exclude color
  createTag: (tagData: { name: string; description?: string }) => Promise<Tag | null>; 
}


export const useQuestionBank = (): UseQuestionBankReturn => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DBQuestion[]>([]);
  const [sections, setSections] = useState<QuestionSection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]); // Add state for tags

  // Load Tags
  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tags').select('*');
      if (error) throw error;
      setTags(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading tags:', err);
      setError(err.message);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load questions
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      // Select columns matching DBQuestion type (excluding tags)
      const { data, error } = await supabase
        .from('questions')
        .select('id, subsection_id, text, description, type, required, options, created_at, updated_at'); // Removed created_by, validation_rules

      if (error) throw error;
      
      const questionsData = data || [];
      const questionIds = questionsData.map(q => q.id);
      let questionsWithTags: DBQuestion[] = questionsData as DBQuestion[]; // Initial cast

      // Load tags for these questions
      if (questionIds.length > 0) {
        try {
          const { data: tagsData, error: tagsError } = await supabase
            .from('question_tags')
            .select(`question_id, tags ( id, name, description )`) // Removed color from select
            .in('question_id', questionIds);
          
          if (tagsError) throw tagsError;
          
          const questionTagsMap = new Map<string, Tag[]>();
          for (const item of tagsData || []) {
            if (!item.tags || !item.question_id) continue;
            const questionId = item.question_id;
            const tagData = item.tags as any; 
            // Removed color from Tag object creation
            const tag: Tag = {
              id: tagData.id, name: tagData.name, 
              description: tagData.description || undefined
            };
            if (!questionTagsMap.has(questionId)) {
              questionTagsMap.set(questionId, []);
            }
            questionTagsMap.get(questionId)?.push(tag);
          }
          
          // Attach tags to each question
          questionsWithTags = questionsData.map(q => ({
            ...q,
            tags: questionTagsMap.get(q.id) || []
          })) as DBQuestion[];
        } catch (tagErr) {
          console.error('Error loading question tags:', tagErr);
          // Proceed with questions even if tag loading fails
        }
      }
      
      setQuestions(questionsWithTags);
      setError(null);
    } catch (err: any) {
      console.error('Error loading questions:', err);
      setError(err.message);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sections (and subsections)
  const loadSections = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch both sections and subsections if they are in the same table
      // Adjust query based on actual table structure if different
      const { data, error } = await supabase
        .from('sections') // Assuming sections table holds both
        .select('*')
        .order('order_index', { ascending: true }); // Order them

      if (error) throw error;
      
      setSections(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading sections:', err);
      setError(err.message);
      toast.error('Failed to load question sections');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a question with tags
  const addQuestion = async (question: QuestionInputData): Promise<DBQuestion | null> => {
    if (!user) {
      toast.error('You must be logged in to add questions');
      return null;
    }
    
    // Separate tags from the main question data for insertion
    const { tags: selectedTagsData, ...questionInsertData } = question;

    try {
      setLoading(true);
      
      // Add check for subsection_id
      if (!questionInsertData.subsection_id) {
        toast.error("Cannot save question: Subsection ID is missing.");
        console.error("Error adding question: subsection_id is missing", questionInsertData);
        setLoading(false);
        return null; // Exit if subsection_id is missing
      }

      // Step 1: Call the PostgreSQL function using rpc
      // Prepare arguments for the RPC function, ensuring keys match function parameters
      const rpcArgs = {
        p_subsection_id: questionInsertData.subsection_id,
        p_text: questionInsertData.text,
        p_description: questionInsertData.description || null, 
        p_type: questionInsertData.type,
        p_required: questionInsertData.required,
        p_options: questionInsertData.options || null, 
        p_tag_ids: selectedTagsData.map(tag => tag.id) 
      };
      console.log("Calling create_question_with_tags with args:", rpcArgs); 

      // The .rpc method returns { data, error }, where data is the function's return value
      const { data: newQuestionData, error: rpcError } = await supabase
        .rpc('create_question_with_tags', rpcArgs);

      if (rpcError) throw rpcError;
      // The function returns the new question row, which might be nested under a key or be the direct data
      // Adjust based on actual return structure if needed. Assuming direct return for now.
      const newQuestion = newQuestionData as DBQuestion; 
      if (!newQuestion) throw new Error("RPC function did not return question data.");

      // RPC function handles tag association.
      
      // Step 2: Update local state with the new question including tags 
      const questionWithTags: DBQuestion = {
        ...newQuestion,
        tags: selectedTagsData || [] // Add the tags back for local state
      };
      setQuestions(prev => [...prev, questionWithTags]);
      toast.success('Question added successfully');
      return questionWithTags;

    } catch (err: any) {
      console.error('Error adding question:', err);
      setError(err.message);
      toast.error(`Failed to add question: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a question with tags
  const updateQuestion = async (id: string, updates: Partial<QuestionInputData>): Promise<DBQuestion | null> => {
     if (!user) {
      toast.error('You must be logged in to update questions');
      return null;
    }

    const { tags: updatedTagsData, ...questionUpdateData } = updates;

    try {
      setLoading(true);
      
      // Step 1: Update the question basics
      const { data: updatedQuestion, error: questionUpdateError } = await supabase
        .from('questions')
        .update(questionUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (questionUpdateError) throw questionUpdateError;
      if (!updatedQuestion) throw new Error("Failed to get updated question data.");

      // Step 2: Update tag associations if updatedTagsData is provided
      if (updatedTagsData !== undefined) {
          // Delete existing tags for this question
          const { error: deleteError } = await supabase
              .from('question_tags')
              .delete()
              .eq('question_id', id);

          if (deleteError) {
              console.error('Error deleting old question tags:', deleteError);
              toast.error('Failed to update tags (delete step).');
              // Continue with update? Or rollback/fail? For now, continue.
          }

          // Insert new tags if any
          if (updatedTagsData.length > 0) {
              const newTagAssociations = updatedTagsData.map(tag => ({
                  question_id: id,
                  tag_id: tag.id
              }));
              const { error: insertError } = await supabase
                  .from('question_tags')
                  .insert(newTagAssociations);

              if (insertError) {
                  console.error('Error inserting new question tags:', insertError);
                  toast.error('Failed to update tags (insert step).');
                  // Continue with update?
              }
          }
      }
      
      // Step 3: Update local state
      const finalUpdatedQuestion: DBQuestion = {
        ...updatedQuestion,
        tags: updatedTagsData || questions.find(q => q.id === id)?.tags || [] // Use new tags or fallback to old ones if not provided
      };
      setQuestions(prev => prev.map(q => q.id === id ? finalUpdatedQuestion : q));
      toast.success('Question updated successfully');
      return finalUpdatedQuestion;

    } catch (err: any) {
      console.error('Error updating question:', err);
      setError(err.message);
      toast.error(`Failed to update question: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a question (also deletes related tags implicitly via CASCADE or needs explicit delete)
  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      // Assuming CASCADE delete is set on question_tags foreign key
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast.success('Question deleted successfully');
      return true;
    } catch (err: any) {
      console.error('Error deleting question:', err);
      setError(err.message);
      toast.error('Failed to delete question');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add a section
  const addSection = async (section: Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>): Promise<QuestionSection | null> => {
    if (!user) {
      toast.error('You must be logged in to add sections');
      return null;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sections') // Correct table name
        .insert({
          name: section.name,
          description: section.description,
          parent_section_id: section.parent_section_id,
          order_index: section.order_index || 0, // Use correct column name
        })
        .select()
        .single();

      if (error) throw error;
      
      setSections(prev => [...prev, data]);
      toast.success('Section added successfully');
      return data;
    } catch (err: any) {
      console.error('Error adding section:', err);
      setError(err.message);
      toast.error('Failed to add section');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a section
  const updateSection = async (id: string, updates: Partial<Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>>): Promise<QuestionSection | null> => {
    try {
      setLoading(true);
      const cleanUpdates = { ...updates }; // Clone updates
      
      // Remove undefined properties
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key as keyof typeof cleanUpdates] === undefined) {
          delete cleanUpdates[key as keyof typeof cleanUpdates];
        }
      });
      
      const { data, error } = await supabase
        .from('sections') // Correct table name
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setSections(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Section updated successfully');
      return data;
    } catch (err: any) {
      console.error('Error updating section:', err);
      setError(err.message);
      toast.error('Failed to update section');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a section
  const deleteSection = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('sections') // Correct table name
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSections(prev => prev.filter(c => c.id !== id));
      toast.success('Section deleted successfully');
      return true;
    } catch (err: any) {
      console.error('Error deleting section:', err);
      setError(err.message);
      toast.error('Failed to delete section');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add createTag function with updated input type
  const createTag = async (tagData: { name: string; description?: string }): Promise<Tag | null> => {
     if (!user) {
      toast.error('You must be logged in to create tags');
      return null;
    }
    try {
      setLoading(true);
      const { data: newTag, error } = await supabase
        .from('tags')
        // Explicitly specify columns to insert
        // Only insert name and description
        .insert([{ 
            name: tagData.name, 
            description: tagData.description 
        }]) 
        .select()
        .single();

      if (error) throw error;
      
      setTags(prev => [...prev, newTag]); // Update local tags state
      toast.success('Tag created successfully');
      return newTag;

    } catch (err: any) {
      console.error('Error creating tag:', err);
      setError(err.message);
      toast.error(`Failed to create tag: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadQuestions();
    loadSections();
    loadTags(); // Load tags as well
  }, [loadQuestions, loadSections, loadTags]); // Add loadTags dependency

  return {
    questions,
    sections,
    tags, // Expose tags
    loading,
    error,
    loadQuestions,
    loadSections,
    loadTags, // Expose loadTags
    addQuestion,
    updateQuestion,
    deleteQuestion,
    addSection,
    updateSection,
    deleteSection,
    createTag, // Expose createTag
  };
};
