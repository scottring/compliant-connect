import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Question, Tag, TableColumn } from '@/types'; // Import TableColumn
import { toast } from 'sonner';

// Define separate types based on the actual schema
export type Section = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type Subsection = {
  id: string;
  section_id: string; // Foreign key to sections table
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

// Use Supabase enum type directly for consistency, but extend it manually for LIST_TABLE
import { Database } from '@/types/supabase';
type SupabaseQuestionType = Database['public']['Enums']['question_type'];
export type QuestionType = SupabaseQuestionType | 'LIST_TABLE'; // Manually add LIST_TABLE

// Original local type: 'text' | 'number' | 'boolean' | 'select' | 'multi-select' | 'file' | 'table';
// Supabase enum type: 'text' | 'number' | 'boolean' | 'single_select' | 'multi_select' | 'date' | 'file'
// Combined type: 'text' | 'number' | 'boolean' | 'single_select' | 'multi_select' | 'date' | 'file' | 'LIST_TABLE'
// Note: 'table' is not in Supabase enum, 'date' is not in local. 'select' maps to 'single_select'.

// DB Question type matching schema
export type DBQuestion = {
  id: string;
  subsection_id: string; // Corrected column name from schema
  text: string; // Renamed from 'title' to match schema
  description: string | null;
  type: QuestionType;
  required: boolean; // Renamed from 'is_required' to match schema
  options: any | null; // Keep as any for flexibility, matches schema
  created_by?: string; // Make optional as it's not always fetched/needed
  created_at: string;
  updated_at: string;
  tags: Tag[]; // Make tags required for UI state
  table_config?: TableColumn[] | null; // Add table_config
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
  table_config?: TableColumn[] | null; // Add table_config
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
  sections: Section[];
  subsections: Subsection[];
  tags: Tag[];

  // Loading states from queries
  isLoadingQuestions: boolean;
  isLoadingStructure: boolean; // For sections/subsections
  isLoadingTags: boolean;

  // Error states from queries
  errorQuestions: Error | null;
  errorStructure: Error | null; // For sections/subsections
  errorTags: Error | null;

  // General loading/error for manual mutations
  loading: boolean;
  error: string | null;

  // Expose mutation functions that return promises
  createQuestion: (data: QuestionInputData) => Promise<DBQuestion>;
  createTag: (data: { name: string; description?: string }) => Promise<Tag>;
  updateQuestion: (id: string, updates: Partial<QuestionInputData>) => Promise<DBQuestion>;
  deleteQuestion: (id: string) => Promise<boolean>;
  addSection: (data: Omit<Section, 'id' | 'created_at' | 'updated_at'>) => Promise<Section>;
  addSubsection: (data: Omit<Subsection, 'id' | 'created_at' | 'updated_at'>) => Promise<Subsection>;
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
            if (!question.subsection_id) throw new Error("Subsection ID missing");
            // Destructure table_config as well
            const { tags: selectedTags, table_config: tableConfig, ...questionData } = question;
            const tagIds = selectedTags?.map(tag => tag.id) || [];

            // TODO: Update the RPC function 'create_question_with_tags' to accept 'p_table_config JSONB'
            // Assuming the RPC function is updated, pass table_config
            const { data: newQuestionData, error: rpcError } = await supabase.rpc('create_question_with_tags', {
                p_subsection_id: questionData.subsection_id, p_text: questionData.text,
                p_description: questionData.description || null, p_type: questionData.type as QuestionType,
                p_required: questionData.required, p_options: questionData.options || null, p_tag_ids: tagIds,
                p_table_config: tableConfig || null // Pass table_config to RPC
            });
            if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
            const rpcResult = newQuestionData as any;
            if (!rpcResult || !rpcResult.id) throw new Error("RPC function did not return expected question ID.");
            // Fetch the newly created question including table_config
            const { data: fetchedQuestionData, error: fetchError } = await supabase.from('questions')
                .select('id, subsection_id, text, description, type, required, options, table_config, created_at, updated_at') // Select table_config
                .eq('id', rpcResult.id).single();
            if (fetchError) throw new Error(`Fetch after create failed: ${fetchError.message}`);
            if (!fetchedQuestionData) throw new Error("Newly created question data not found after fetch.");

            // Construct the final object including tags and table_config
            const completeNewQuestionWithTags: DBQuestion = {
                ...(fetchedQuestionData as Omit<DBQuestion, 'tags' | 'created_by'>), // Base type assertion
                tags: selectedTags || [],
                table_config: fetchedQuestionData.table_config || null // Ensure table_config is included
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
            // Destructure tags and table_config separately
            const { tags: updatedTagsData, table_config: updatedTableConfig, ...questionUpdateData } = updates;

            // Prepare the update payload, including table_config if present
            const updatePayload: Partial<Omit<DBQuestion, 'id' | 'created_at' | 'updated_at' | 'tags' | 'created_by'>> = { ...questionUpdateData };
            if (updatedTableConfig !== undefined) {
                updatePayload.table_config = updatedTableConfig;
            }

            // Update the question, selecting the updated fields including table_config
            const { data: updatedQuestion, error: questionUpdateError } = await supabase.from('questions')
                .update(updatePayload).eq('id', id)
                .select('id, subsection_id, text, description, type, required, options, table_config, created_at, updated_at') // Select table_config
                .single();
            if (questionUpdateError) throw new Error(`Question update failed: ${questionUpdateError.message}`);
            if (!updatedQuestion) throw new Error("Update failed: No data returned after update.");

            // Handle tags update (unchanged logic)
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
            const currentQuestion = currentQuestions.find(q => q.id === id);

            // Construct the final object, ensuring tags and table_config are correctly merged
            const finalUpdatedQuestion: DBQuestion = {
                ...(updatedQuestion as Omit<DBQuestion, 'tags'>), // Assert base type after select
                tags: updatedTagsData || currentQuestion?.tags || [],
                // table_config is already included in updatedQuestion due to the .select()
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
): UseMutationResult<Section, Error, Omit<Section, 'id' | 'created_at' | 'updated_at'>> => {
    return useMutation<Section, Error, Omit<Section, 'id' | 'created_at' | 'updated_at'>>({
        mutationFn: async (sectionData) => { /* ... implementation ... */
            if (!user) throw new Error('You must be logged in');
            const { data, error } = await supabase.from('sections')
                .insert({
                    name: sectionData.name,
                    description: sectionData.description,
                    order_index: sectionData.order_index || 0,
                 })
                .select()
                .single();
            if (error) throw new Error(`Add section failed: ${error.message}`);
            if (!data) throw new Error("Add section failed: No data returned.");
            return data;
        },
        onSuccess: () => { /* ... implementation ... */
            queryClient.invalidateQueries({ queryKey: ['sectionsAndSubsections'] });
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

// --- Reusable Add Subsection Mutation Hook ---
const useAddSubsectionMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user'],
    setError: React.Dispatch<React.SetStateAction<string | null>>
): UseMutationResult<Subsection, Error, Omit<Subsection, 'id' | 'created_at' | 'updated_at'>> => {
    return useMutation<Subsection, Error, Omit<Subsection, 'id' | 'created_at' | 'updated_at'>>({
        mutationFn: async (subsectionData) => {
            if (!user) throw new Error('You must be logged in');
            if (!subsectionData.section_id) throw new Error('Section ID missing');
            const { data, error } = await supabase.from('subsections')
                .insert({ ...subsectionData })
                .select()
                .single();
            if (error) throw new Error(`Add subsection failed: ${error.message}`);
            if (!data) throw new Error("Add subsection failed: No data returned.");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sectionsAndSubsections'] });
            toast.success('Subsection added successfully');
            setError(null);
        },
        onError: (error) => {
            console.error('Error adding subsection:', error);
            setError(error.message);
            toast.error(`Failed to add subsection: ${error.message}`);
        },
    });
};
// --- End Add Subsection Mutation Hook ---


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
    // Select table_config along with other question fields
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions').select('id, subsection_id, text, description, type, required, options, table_config, created_at, updated_at'); // Added table_config
    if (questionsError) { console.error('Error loading questions:', questionsError); throw new Error(questionsError.message); }
    if (!questionsData) return [];
    const questionIds = questionsData.map(q => q.id);
    if (questionIds.length === 0) return questionsData.map(q => ({ ...q, tags: [] })) as DBQuestion[];
    // Select created_at and updated_at from tags as well
    const { data: tagsData, error: tagsError } = await supabase.from('question_tags')
      .select(`question_id, tags ( id, name, description, created_at, updated_at )`).in('question_id', questionIds);
    if (tagsError) {
      console.error('Error loading question tags:', tagsError);
      return questionsData.map(q => ({ ...q, tags: [] })) as DBQuestion[];
    }
    const questionTagsMap = new Map<string, Tag[]>();
    if (tagsData) {
      for (const item of tagsData) {
        // Check if item.tags exists and is a valid object (not null, not array)
        if (!item.tags || typeof item.tags !== 'object' || Array.isArray(item.tags) || !item.question_id) {
            // Log if the structure is unexpected, but continue processing other tags
            if (item.tags) { // Only log if tags exist but are not the expected object
                 console.warn(`Unexpected tag structure for question_id ${item.question_id}:`, item.tags);
            }
            continue;
        }
        const questionId = item.question_id;
        // Assert the structure of the joined tag data - TS should infer this now, but explicit assertion is safer
        const tagData = item.tags as Tag;

        // Construct the Tag object, ensuring all required fields are present
        // The 'as Tag' assertion implies these fields exist if the assertion is correct.
        const tag: Tag = {
          id: tagData.id,
          name: tagData.name,
          description: tagData.description, // Already optional in Tag type
          created_at: tagData.created_at, // Already optional in Tag type
          updated_at: tagData.updated_at, // Already optional in Tag type
        };

        // Add the tag to the map
        if (!questionTagsMap.has(questionId)) {
          questionTagsMap.set(questionId, []);
        }
        questionTagsMap.get(questionId)?.push(tag);
      }
    }
    // Map questions and ensure table_config is included
    return questionsData.map(q => ({
       ...q,
       tags: questionTagsMap.get(q.id) || [],
       table_config: q.table_config || null // Ensure table_config exists, default to null if undefined/null in DB
      })) as DBQuestion[];
  };
  const { data: questions, isLoading: isLoadingQuestions, error: errorQuestions } = useQuery<DBQuestion[], Error>({
    queryKey: ['questions'],
    queryFn: fetchQuestionsWithTags,
    // The select function within fetchQuestionsWithTags now handles the mapping including table_config
  });
  // --- End Fetch Questions ---

  // --- Fetch Sections and Subsections using React Query ---
  const fetchSectionsAndSubsections = async (): Promise<{ sections: Section[], subsections: Subsection[] }> => { /* ... implementation ... */
    const { data: sectionsData, error: sectionsError } = await supabase.from('sections')
      .select('*').order('order_index', { ascending: true });
    if (sectionsError) { console.error('Error loading sections:', sectionsError); throw new Error(sectionsError.message); }
    const { data: subsectionsData, error: subsectionsError } = await supabase.from('subsections')
      .select('*').order('order_index', { ascending: true });
    if (subsectionsError) { console.error('Error loading subsections:', subsectionsError); throw new Error(subsectionsError.message); }
    return { sections: sectionsData || [], subsections: subsectionsData || [] };
  };
  const { data: structureData, isLoading: isLoadingStructure, error: errorStructure } = useQuery<{ sections: Section[], subsections: Subsection[] }, Error>({
    queryKey: ['sectionsAndSubsections'], queryFn: fetchSectionsAndSubsections,
  });
  // --- End Fetch Sections/Subsections ---

  // --- Mutations ---
  const createTagMutation = useCreateTagMutation(queryClient, user, setError);
  const createQuestionMutation = useCreateQuestionMutation(queryClient, user, setError);
  const updateQuestionMutation = useUpdateQuestionMutation(queryClient, user, setError);
  const deleteQuestionMutation = useDeleteQuestionMutation(queryClient, user, setError);
  const addSectionMutation = useAddSectionMutation(queryClient, user, setError);
  const addSubsectionMutation = useAddSubsectionMutation(queryClient, user, setError); // Call the hook

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
    sections: structureData?.sections || [],
    subsections: structureData?.subsections || [],
    isLoadingStructure,
    errorStructure,

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
    addSection: (data: Omit<Section, 'id' | 'created_at' | 'updated_at'>) => {
      return new Promise<Section>((resolve, reject) => {
        addSectionMutation.mutate(data, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    },
    addSubsection: (data: Omit<Subsection, 'id' | 'created_at' | 'updated_at'>) => {
      return new Promise<Subsection>((resolve, reject) => {
        addSubsectionMutation.mutate(data, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    },
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
