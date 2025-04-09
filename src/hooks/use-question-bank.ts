import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tag } from '@/types'; // Removed Question import
import { toast } from 'sonner';

// Type for the new self-referencing sections table
export type QuestionSection = {
  id: string;
  parent_id: string | null; // Self-referencing key
  name: string;
  description: string | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
};

// Subsection type is now obsolete

// Use Supabase enum type directly for consistency
import { Database } from '@/types/supabase';
export type QuestionType = Database['public']['Enums']['question_type'];
// Original local type: 'text' | 'number' | 'boolean' | 'select' | 'multi-select' | 'file' | 'table';
// Supabase enum type: 'text' | 'number' | 'boolean' | 'single_select' | 'multi_select' | 'date' | 'file'
// Note: 'table' is not in Supabase enum, 'date' is not in local. 'select' maps to 'single_select'.

// DB Question type matching schema
export type DBQuestion = {
  id: string;
  section_id: string; // Renamed from subsection_id
  text: string; // Renamed from 'title' to match schema
  description: string | null;
  type: QuestionType;
  required: boolean; // Renamed from 'is_required' to match schema
  options: any | null; // Keep as any for flexibility, matches schema
  created_by?: string; // Make optional as it's not always fetched/needed
  created_at: string;
  updated_at: string;
  tags: Tag[]; // Make tags required for UI state
  // Fields from the view
  hierarchical_number?: string;
  section_name?: string;
  section_level?: number;
};

// Input type for creating/updating questions (maps UI state to DB structure)
export type QuestionInputData = {
  text: string;
  description?: string | null;
  required: boolean;
  type: QuestionType;
  tags: Tag[]; // Array of selected Tag objects
  options?: string[] | null;
  section_id: string; // Renamed from subsection_id
};


interface QuestionTagJoin {
  question_id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    description: string | null;
  };
}

// Define the return type for the hook explicitly
export interface UseQuestionBankReturn {
  // Data from queries
  questions: DBQuestion[];
  // sections: Section[]; // Replaced by querying the view
  // subsections: Subsection[]; // Replaced by querying the view
  tags: Tag[];

  // Loading states from queries
  isLoadingQuestions: boolean;
  // isLoadingStructure: boolean; // Removed
  isLoadingTags: boolean;

  // Error states from queries
  errorQuestions: Error | null;
  // errorStructure: Error | null; // Removed
  errorTags: Error | null;

  // General loading/error for manual mutations
  loading: boolean;
  error: string | null;

  // Expose mutation functions that return promises
  createQuestion: (data: QuestionInputData) => Promise<DBQuestion>;
  createTag: (data: { name: string; description?: string }) => Promise<Tag>;
  updateQuestion: (id: string, updates: Partial<QuestionInputData>) => Promise<DBQuestion>;
  deleteQuestion: (id: string) => Promise<boolean>;
  // Updated addSection signature to accept parent_id
  addSection: (data: Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>) => Promise<QuestionSection>;
  // addSubsection: (data: Omit<Subsection, 'id' | 'created_at' | 'updated_at'>) => Promise<Subsection>; // Removed
}

// --- Reusable Create Tag Mutation Hook Definition (Module Level) ---
const useCreateTagMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user'],
    setError: React.Dispatch<React.SetStateAction<string | null>>
): UseMutationResult<Tag, Error, { name: string; description?: string }> => {
  return useMutation<Tag, Error, { name: string; description?: string }>({
    mutationFn: async (tagData) => {
        if (!user) throw new Error('You must be logged in to add tags');
        
        // Create the new tag
        const { data: newTag, error: createError } = await supabase
            .from('tags')
            .insert([{ 
                name: tagData.name.trim(), 
                description: tagData.description?.trim() || null
            }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating tag:', createError);
            if (createError.code === '23505') {
                throw new Error('A tag with this name already exists');
            }
            throw new Error(`Failed to create tag: ${createError.message}`);
        }
        
        if (!newTag) {
            throw new Error("Failed to create tag: No data returned");
        }
        
        return newTag;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tags'] });
        toast.success('Tag created successfully');
        setError(null);
    },
    onError: (error) => {
        console.error('Error creating tag:', error);
        setError(error.message);
        toast.error(`Failed to create tag: ${error.message}`);
    },
  });
};
// --- End Create Tag Mutation Hook Definition ---

// --- Reusable Create Question Mutation Hook ---
const useCreateQuestionMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user'],
    setError: React.Dispatch<React.SetStateAction<string | null>>
): UseMutationResult<DBQuestion, Error, QuestionInputData> => {
    return useMutation<DBQuestion, Error, QuestionInputData>({
        mutationFn: async (question) => { /* ... implementation ... */
            if (!user) throw new Error('You must be logged in');
            if (!question.section_id) throw new Error("Section ID missing"); // Use section_id
            const { tags: selectedTags, ...questionData } = question;
            const tagIds = selectedTags?.map(tag => tag.id) || [];
            const { data: newQuestionData, error: rpcError } = await supabase.rpc('create_question_with_tags', {
                p_subsection_id: questionData.section_id, p_text: questionData.text, // Pass section_id (assuming RPC is updated)
                p_description: questionData.description || null, p_type: questionData.type as QuestionType, // Ensure type matches Supabase enum
                p_required: questionData.required, p_options: questionData.options || null, p_tag_ids: tagIds
            });
            if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
            const rpcResult = newQuestionData as any;
            if (!rpcResult || !rpcResult.id) throw new Error("RPC function did not return expected question ID.");
            const { data: fetchedQuestionData, error: fetchError } = await supabase.from('questions')
                .select('id, section_id, text, description, type, required, options, created_at, updated_at') // Select section_id
                .eq('id', rpcResult.id).single();
            if (fetchError) throw new Error(`Fetch after create failed: ${fetchError.message}`);
            if (!fetchedQuestionData) throw new Error("Newly created question data not found after fetch.");
            const completeNewQuestionWithTags: DBQuestion = {
                ...(fetchedQuestionData as Omit<DBQuestion, 'tags' | 'created_by'>),
                tags: selectedTags || []
            };
            return completeNewQuestionWithTags;
        },
        onSuccess: () => { /* ... implementation ... */
            queryClient.invalidateQueries({ queryKey: ['questions'] });
            toast.success('Question added successfully');
            setError(null);
        },
        onError: (error) => { /* ... implementation ... */
            console.error('Error adding question:', error);
            setError(error.message);
            toast.error(`Failed to add question: ${error.message}`);
        },
    });
};
// --- End Create Question Mutation Hook ---

// --- Reusable Update Question Mutation Hook ---
const useUpdateQuestionMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user'],
    setError: React.Dispatch<React.SetStateAction<string | null>>
): UseMutationResult<DBQuestion, Error, { id: string; updates: Partial<QuestionInputData> }> => {
    return useMutation<DBQuestion, Error, { id: string; updates: Partial<QuestionInputData> }>({
        mutationFn: async ({ id, updates }) => { /* ... implementation ... */
            if (!user) throw new Error('You must be logged in');
            const { tags: updatedTagsData, ...questionUpdateData } = updates;
            const { data: updatedQuestion, error: questionUpdateError } = await supabase.from('questions')
                .update(questionUpdateData as any).eq('id', id).select().single(); // Use 'as any' temporarily to bypass complex type mismatch during update, review if specific update type is better
            if (questionUpdateError) throw new Error(`Question update failed: ${questionUpdateError.message}`);
            if (!updatedQuestion) throw new Error("Update failed: No data returned after update.");
            if (updatedTagsData !== undefined) {
                const { error: deleteError } = await supabase.from('question_tags').delete().eq('question_id', id);
                if (deleteError) console.error('Non-fatal: Error deleting old tags during update:', deleteError);
                if (updatedTagsData.length > 0) {
                    const newTagAssociations = updatedTagsData.map(tag => ({ question_id: id, tag_id: tag.id }));
                    const { error: insertError } = await supabase.from('question_tags').insert(newTagAssociations);
                    if (insertError) console.error('Non-fatal: Error inserting new tags during update:', insertError);
                }
            }
            const currentQuestions = queryClient.getQueryData<DBQuestion[]>(['questions']) || [];
            // Ensure the returned object matches DBQuestion, especially the 'type'
            const finalUpdatedQuestion: DBQuestion = {
                ...updatedQuestion,
                tags: updatedTagsData || currentQuestions.find(q => q.id === id)?.tags || []
            };
            return finalUpdatedQuestion;
        },
        onSuccess: (data, variables) => { /* ... implementation ... */
            queryClient.invalidateQueries({ queryKey: ['questions'] });
            toast.success('Question updated successfully');
            setError(null);
        },
        onError: (error) => { /* ... implementation ... */
            console.error('Error updating question:', error);
            setError(error.message);
            toast.error(`Failed to update question: ${error.message}`);
        },
    });
};
// --- End Update Question Mutation Hook ---

// --- Reusable Delete Question Mutation Hook ---
const useDeleteQuestionMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user'],
    setError: React.Dispatch<React.SetStateAction<string | null>>
): UseMutationResult<boolean, Error, string> => {
    return useMutation<boolean, Error, string>({
        mutationFn: async (id) => { /* ... implementation ... */
            if (!user) throw new Error('You must be logged in');
            const { error } = await supabase.from('questions').delete().eq('id', id);
            if (error) throw new Error(`Delete failed: ${error.message}`);
            return true;
        },
        onSuccess: () => { /* ... implementation ... */
            queryClient.invalidateQueries({ queryKey: ['questions'] });
            toast.success('Question deleted successfully');
            setError(null);
        },
        onError: (error) => { /* ... implementation ... */
            console.error('Error deleting question:', error);
            setError(error.message);
            toast.error(`Failed to delete question: ${error.message}`);
        },
    });
};
// --- End Delete Question Mutation Hook ---

// --- Reusable Add Section Mutation Hook ---
const useAddSectionMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user'],
    setError: React.Dispatch<React.SetStateAction<string | null>>
): UseMutationResult<QuestionSection, Error, Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>> => { // Use QuestionSection
    return useMutation<QuestionSection, Error, Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>>({ // Use QuestionSection
        mutationFn: async (sectionData) => { /* ... implementation ... */
            if (!user) throw new Error('You must be logged in');
            // Insert into the renamed table, include parent_id
            const { data, error } = await supabase.from('question_sections')
                .insert({
                    name: sectionData.name,
                    description: sectionData.description,
                    order_index: sectionData.order_index || 0,
                    parent_id: sectionData.parent_id || null // Add parent_id
                 })
                .select()
                .single();
            if (error) throw new Error(`Add section failed: ${error.message}`);
            if (!data) throw new Error("Add section failed: No data returned.");
            return data;
        },
        onSuccess: () => { /* ... implementation ... */
            queryClient.invalidateQueries({ queryKey: ['questions'] }); // Invalidate questions query as view depends on sections
            toast.success('Section added successfully');
            setError(null);
        },
        onError: (error) => { /* ... implementation ... */
            console.error('Error adding section:', error);
            setError(error.message);
            toast.error(`Failed to add section: ${error.message}`);
        },
    });
};
// --- End Add Section Mutation Hook ---

// --- Add Subsection Mutation Hook Removed ---


// --- Main Hook Definition ---
export const useQuestionBank = (): UseQuestionBankReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- State (Keep general loading/error for manual mutations for now) ---
  const [loading, setLoading] = useState(false); // Can likely be removed later
  const [error, setError] = useState<string | null>(null); // Can likely be removed later

  // --- Fetch Tags using React Query ---
  const fetchTags = async (): Promise<Tag[]> => { /* ... implementation ... */
    const { data, error } = await supabase.from('tags').select('*');
    if (error) { console.error('Error loading tags:', error); throw new Error(error.message); }
    return data || [];
  };
  const { data: tags, isLoading: isLoadingTags, error: errorTags } = useQuery<Tag[], Error>({
    queryKey: ['tags'], queryFn: fetchTags,
  });
  // --- End Fetch Tags ---

  // --- Fetch Questions using React Query ---
  const fetchQuestionsWithTags = async (): Promise<DBQuestion[]> => { /* ... implementation ... */
    const { data: questionsData, error: questionsError } = await supabase
      // Query the new view instead of the questions table directly
      .from('v_question_bank_numbered')
      .select(`
        question_id:id, section_id, question_text:text, question_description:description,
        question_type:type, question_required:required, question_options:options,
        question_created_at:created_at, question_updated_at:updated_at,
        hierarchical_number, section_name, section_level
      `);
    if (questionsError) { console.error('Error loading questions:', questionsError); throw new Error(questionsError.message); }
    if (!questionsData) return [];
    // Removed incorrect questionIds declaration here
    // Map view results to DBQuestion structure
    const mappedQuestions = questionsData.map(q => ({
        id: q.question_id,
        section_id: q.section_id,
        text: q.question_text,
        description: q.question_description,
        type: q.question_type,
        required: q.question_required,
        options: q.question_options,
        created_at: q.question_created_at,
        updated_at: q.question_updated_at,
        hierarchical_number: q.hierarchical_number,
        section_name: q.section_name,
        section_level: q.section_level,
        tags: [] // Placeholder, tags will be added next
    }));

    const questionIds = mappedQuestions.map(q => q.id);
    if (questionIds.length === 0) return mappedQuestions;
    const { data: tagsData, error: tagsError } = await supabase.from('question_tags')
      .select(`question_id, tags ( id, name, description, created_at, updated_at )`).in('question_id', questionIds); // Added created_at, updated_at for tags
    if (tagsError) {
      console.error('Error loading question tags:', tagsError);
      // If tags fail, return questions with empty tags array
      return mappedQuestions.map(q => ({ ...q, tags: [] }));
    }
    const questionTagsMap = new Map<string, Tag[]>();
    if (tagsData) {
      for (const item of tagsData) { // Add created_at and updated_at to the Tag object
        if (!item.tags || !item.question_id) continue;
        const questionId = item.question_id;
        const tagData = item.tags as any;
        const tag: Tag = { id: tagData.id, name: tagData.name, description: tagData.description || null, created_at: tagData.created_at, updated_at: tagData.updated_at };
        if (!questionTagsMap.has(questionId)) questionTagsMap.set(questionId, []);
        questionTagsMap.get(questionId)?.push(tag);
      }
    }
    // Add tags to the mapped questions
    return mappedQuestions.map(q => ({ ...q, tags: questionTagsMap.get(q.id) || [] }));
  };
  const { data: questions, isLoading: isLoadingQuestions, error: errorQuestions } = useQuery<DBQuestion[], Error>({
    queryKey: ['questions'], queryFn: fetchQuestionsWithTags,
  });
  // --- End Fetch Questions ---

  // --- Fetch Sections and Subsections Removed ---

  // --- Mutations ---
  const createTagMutation = useCreateTagMutation(queryClient, user, setError);
  const createQuestionMutation = useCreateQuestionMutation(queryClient, user, setError);
  const updateQuestionMutation = useUpdateQuestionMutation(queryClient, user, setError);
  const deleteQuestionMutation = useDeleteQuestionMutation(queryClient, user, setError);
  const addSectionMutation = useAddSectionMutation(queryClient, user, setError);
  // const addSubsectionMutation = useAddSubsectionMutation(queryClient, user, setError); // Removed

  // --- Manual Mutation Functions (None remaining) ---

  // --- Return Value ---
  return {
    // Manual state/functions (can likely remove now)
    loading,
    error,

    // From useQuery results
    tags: tags || [],
    isLoadingTags,
    errorTags,
    questions: questions || [],
    isLoadingQuestions,
    errorQuestions,
    // sections: structureData?.sections || [], // Removed
    // subsections: structureData?.subsections || [], // Removed
    // isLoadingStructure, // Removed
    // errorStructure, // Removed

    // Expose mutation functions that return promises
    createQuestion: (data: QuestionInputData) => {
      return new Promise<DBQuestion>((resolve, reject) => {
        createQuestionMutation.mutate(data, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    },
    createTag: (data: { name: string; description?: string }) => {
      return new Promise<Tag>((resolve, reject) => {
        createTagMutation.mutate(data, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    },
    updateQuestion: (id: string, updates: Partial<QuestionInputData>) => {
      return new Promise<DBQuestion>((resolve, reject) => {
        updateQuestionMutation.mutate({ id, updates }, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    },
    deleteQuestion: (id: string) => {
      return new Promise<boolean>((resolve, reject) => {
        deleteQuestionMutation.mutate(id, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    },
    // Updated addSection to use QuestionSection type
    addSection: (data: Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>) => {
      return new Promise<QuestionSection>((resolve, reject) => {
        addSectionMutation.mutate(data, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    },
    // addSubsection removed
  };
};

// Helper function to safely stringify options
function safeStringify(value: any): string | null {
  try {
    return JSON.stringify(value);
  } catch (e) {
    console.error("Failed to stringify options:", e);
    return null;
  }
}
