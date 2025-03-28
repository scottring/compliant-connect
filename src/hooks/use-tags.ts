import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tag } from '@/types';
import { toast } from 'sonner';

export type DBTag = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const useTags = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<DBTag[]>([]);

  // Load tags
  const loadTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*');

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
  };

  // Add a tag
  const addTag = async (tag: Omit<DBTag, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error('You must be logged in to add tags');
      return null;
    }
    
    try {
      setLoading(true);
      
      // SKIP ALL profile checks and just create the tag without created_by
      console.log('Creating tag without profile reference');
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: tag.name,
          color: tag.color,
          description: tag.description
          // Deliberately NOT setting created_by to avoid the foreign key issue
        })
        .select()
        .single();

      if (error) throw error;
      
      setTags(prev => [...prev, data]);
      toast.success('Tag added successfully');
      return data;
    } catch (err: any) {
      console.error('Error adding tag:', err);
      setError(err.message);
      toast.error('Failed to add tag');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a tag
  const updateTag = async (id: string, updates: Partial<Omit<DBTag, 'id' | 'created_by' | 'created_at' | 'updated_at'>>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTags(prev => prev.map(t => t.id === id ? data : t));
      toast.success('Tag updated successfully');
      return data;
    } catch (err: any) {
      console.error('Error updating tag:', err);
      setError(err.message);
      toast.error('Failed to update tag');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a tag
  const deleteTag = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTags(prev => prev.filter(t => t.id !== id));
      toast.success('Tag deleted successfully');
      return true;
    } catch (err: any) {
      console.error('Error deleting tag:', err);
      setError(err.message);
      toast.error('Failed to delete tag');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add a tag to a question
  const addTagToQuestion = async (questionId: string, tagId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_tags')
        .insert({
          question_id: questionId,
          tag_id: tagId
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Tag added to question successfully');
      return data;
    } catch (err: any) {
      console.error('Error adding tag to question:', err);
      setError(err.message);
      toast.error('Failed to add tag to question');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Remove a tag from a question
  const removeTagFromQuestion = async (questionId: string, tagId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('question_tags')
        .delete()
        .match({
          question_id: questionId,
          tag_id: tagId
        });

      if (error) throw error;
      
      toast.success('Tag removed from question successfully');
      return true;
    } catch (err: any) {
      console.error('Error removing tag from question:', err);
      setError(err.message);
      toast.error('Failed to remove tag from question');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get tags for a question
  const getQuestionTags = async (questionId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_tags')
        .select('tag_id')
        .eq('question_id', questionId);

      if (error) throw error;
      
      const tagIds = data.map(item => item.tag_id);
      
      if (tagIds.length === 0) {
        return [];
      }
      
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);
        
      if (tagError) throw tagError;
      
      return tagData || [];
    } catch (err: any) {
      console.error('Error getting question tags:', err);
      setError(err.message);
      toast.error('Failed to get question tags');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadTags();
  }, []);

  return {
    tags,
    loading,
    error,
    loadTags,
    addTag,
    updateTag,
    deleteTag,
    addTagToQuestion,
    removeTagFromQuestion,
    getQuestionTags,
  };
}; 