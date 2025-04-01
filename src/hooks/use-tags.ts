import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client'; // Corrected import path
import { useAuth } from '@/context/AuthContext';
import { Tag } from '@/types'; // Use the existing Tag type
import { toast } from 'sonner';

// DBTag type might be redundant if Tag from '@/types' is sufficient
// export type DBTag = { ... };

// Input type for adding/updating tags (excluding generated fields)
export type TagInput = Omit<Tag, 'id' | 'created_at' | 'updated_at' | 'created_by'>; // Assuming Tag includes these

// Define the return type for the hook explicitly
export interface UseTagsReturn {
  // Data from query
  tags: Tag[];
  isLoadingTags: boolean;
  errorTags: Error | null;

  // Mutations
  addTagMutation: UseMutationResult<Tag, Error, TagInput>;
  updateTagMutation: UseMutationResult<Tag, Error, { id: string; updates: Partial<TagInput> }>;
  deleteTagMutation: UseMutationResult<boolean, Error, string>; // Variable is tag id (string)
}

// --- Reusable Add Tag Mutation Hook ---
const useAddTagMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user']
): UseMutationResult<Tag, Error, TagInput> => {
    return useMutation<Tag, Error, TagInput>({
        mutationFn: async (tagData) => {
            if (!user) throw new Error('You must be logged in to add tags');
            // Note: Original code skipped created_by, maintaining that here.
            // Add created_by: user.id if schema/policy allows/requires it.
            const { data, error } = await supabase
                .from('tags')
                .insert({
                    name: tagData.name,
                    // color: tagData.color, // Assuming color is part of TagInput if needed
                    description: tagData.description
                 })
                .select()
                .single();
            if (error) throw new Error(`Add tag failed: ${error.message}`);
            if (!data) throw new Error("Add tag failed: No data returned.");
            return data as Tag; // Cast assuming DB returns Tag compatible structure
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            toast.success('Tag added successfully');
        },
        onError: (error) => {
            console.error('Error adding tag:', error);
            toast.error(`Failed to add tag: ${error.message}`);
        },
    });
};

// --- Reusable Update Tag Mutation Hook ---
const useUpdateTagMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user']
): UseMutationResult<Tag, Error, { id: string; updates: Partial<TagInput> }> => {
    return useMutation<Tag, Error, { id: string; updates: Partial<TagInput> }>({
        mutationFn: async ({ id, updates }) => {
            if (!user) throw new Error('You must be logged in to update tags');
            const { data, error } = await supabase
                .from('tags')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw new Error(`Update tag failed: ${error.message}`);
            if (!data) throw new Error("Update tag failed: No data returned.");
            return data as Tag;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            toast.success('Tag updated successfully');
        },
        onError: (error) => {
            console.error('Error updating tag:', error);
            toast.error(`Failed to update tag: ${error.message}`);
        },
    });
};

// --- Reusable Delete Tag Mutation Hook ---
const useDeleteTagMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    user: ReturnType<typeof useAuth>['user']
): UseMutationResult<boolean, Error, string> => {
    return useMutation<boolean, Error, string>({
        mutationFn: async (id) => {
            if (!user) throw new Error('You must be logged in to delete tags');
            // Check for dependencies (e.g., question_tags) before deleting if needed,
            // or rely on DB constraints (CASCADE or RESTRICT). Assuming RESTRICT/error for now.
            const { error } = await supabase
                .from('tags')
                .delete()
                .eq('id', id);
            if (error) {
                 // Handle potential foreign key constraint errors (e.g., 23503) gracefully
                 if (error.code === '23503') {
                     throw new Error(`Cannot delete tag: It is still associated with questions.`);
                 }
                 throw new Error(`Delete tag failed: ${error.message}`);
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            toast.success('Tag deleted successfully');
        },
        onError: (error) => {
            console.error('Error deleting tag:', error);
            toast.error(`${error.message}`); // Display specific error (e.g., constraint violation)
        },
    });
};


// --- Main Hook Definition ---
export const useTags = (): UseTagsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- Fetch Tags Query ---
  const fetchTags = async (): Promise<Tag[]> => {
    const { data, error } = await supabase
      .from('tags')
      .select('*'); // Select columns matching Tag type
    if (error) {
        console.error('Error loading tags:', error);
        throw new Error(error.message);
    }
    return (data || []) as Tag[]; // Cast assuming DB returns Tag compatible structure
  };

  const {
    data: tags,
    isLoading: isLoadingTags,
    error: errorTags,
  } = useQuery<Tag[], Error>({
    queryKey: ['tags'],
    queryFn: fetchTags,
  });
  // --- End Fetch Tags Query ---


  // --- Mutations ---
  const addTagMutation = useAddTagMutation(queryClient, user);
  const updateTagMutation = useUpdateTagMutation(queryClient, user);
  const deleteTagMutation = useDeleteTagMutation(queryClient, user);
  // --- End Mutations ---


  // --- Removed question-tag specific functions ---
  // addTagToQuestion, removeTagFromQuestion, getQuestionTags


  // --- Return Value ---
  return {
    tags: tags || [],
    isLoadingTags,
    errorTags,
    addTagMutation,
    updateTagMutation,
    deleteTagMutation,
  };
};