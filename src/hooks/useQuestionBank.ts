import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { Question as BaseQuestion, Tag as BaseTag } from '@/types';

export type Question = BaseQuestion;
export type Tag = BaseTag;

export interface UseQuestionBankReturn {
  questions: Question[];
  tags: Tag[];
  loading: boolean;
  error: Error | null;
  createQuestion: (question: Omit<Question, 'id'>) => Promise<Question>;
  updateQuestion: (id: string, updates: Partial<Question>) => Promise<Question>;
  deleteQuestion: (id: string) => Promise<void>;
  createTag: (tag: Omit<Tag, 'id'>) => Promise<Tag>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  addTagToQuestion: (questionId: string, tagId: string) => Promise<void>;
  removeTagFromQuestion: (questionId: string, tagId: string) => Promise<void>;
  getQuestionsByTag: (tagId: string) => Promise<Question[]>;
  getTagsByQuestion: (questionId: string) => Promise<Tag[]>;
}

export function useQuestionBank(): UseQuestionBankReturn {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all questions and their tags
  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_tags (
            tags (*)
          )
        `);

      if (error) throw error;

      const questionsWithTags = data.map((q: any) => ({
        ...q,
        tags: q.question_tags?.map((qt: any) => qt.tags) || [],
      }));

      setQuestions(questionsWithTags);
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to fetch questions');
    }
  };

  // Fetch all tags
  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*');

      if (error) throw error;
      setTags(data);
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to fetch tags');
    }
  };

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchQuestions(), fetchTags()]);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Create a new question
  const createQuestion = async (question: Omit<Question, 'id'>): Promise<Question> => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([question])
        .select()
        .single();

      if (error) throw error;

      setQuestions([...questions, data]);
      toast.success('Question created successfully');
      return data;
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to create question');
      throw err;
    }
  };

  // Update an existing question
  const updateQuestion = async (id: string, updates: Partial<Question>): Promise<Question> => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setQuestions(questions.map(q => q.id === id ? { ...q, ...data } : q));
      toast.success('Question updated successfully');
      return data;
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to update question');
      throw err;
    }
  };

  // Delete a question
  const deleteQuestion = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setQuestions(questions.filter(q => q.id !== id));
      toast.success('Question deleted successfully');
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to delete question');
      throw err;
    }
  };

  // Create a new tag
  const createTag = async (tag: Omit<Tag, 'id'>): Promise<Tag> => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([tag])
        .select()
        .single();

      if (error) throw error;

      setTags([...tags, data]);
      toast.success('Tag created successfully');
      return data;
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to create tag');
      throw err;
    }
  };

  // Update an existing tag
  const updateTag = async (id: string, updates: Partial<Tag>): Promise<Tag> => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTags(tags.map(t => t.id === id ? { ...t, ...data } : t));
      toast.success('Tag updated successfully');
      return data;
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to update tag');
      throw err;
    }
  };

  // Delete a tag
  const deleteTag = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTags(tags.filter(t => t.id !== id));
      toast.success('Tag deleted successfully');
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to delete tag');
      throw err;
    }
  };

  // Add a tag to a question
  const addTagToQuestion = async (questionId: string, tagId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('question_tags')
        .insert([{ question_id: questionId, tag_id: tagId }]);

      if (error) throw error;

      // Refresh questions to get updated tags
      await fetchQuestions();
      toast.success('Tag added to question successfully');
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to add tag to question');
      throw err;
    }
  };

  // Remove a tag from a question
  const removeTagFromQuestion = async (questionId: string, tagId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('question_tags')
        .delete()
        .eq('question_id', questionId)
        .eq('tag_id', tagId);

      if (error) throw error;

      // Refresh questions to get updated tags
      await fetchQuestions();
      toast.success('Tag removed from question successfully');
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to remove tag from question');
      throw err;
    }
  };

  // Get questions by tag
  const getQuestionsByTag = async (tagId: string): Promise<Question[]> => {
    try {
      const { data, error } = await supabase
        .from('question_tags')
        .select(`
          questions (*)
        `)
        .eq('tag_id', tagId);

      if (error) throw error;

      return data.map((qt: any) => qt.questions);
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to fetch questions by tag');
      throw err;
    }
  };

  // Get tags by question
  const getTagsByQuestion = async (questionId: string): Promise<Tag[]> => {
    try {
      const { data, error } = await supabase
        .from('question_tags')
        .select(`
          tags (*)
        `)
        .eq('question_id', questionId);

      if (error) throw error;

      return data.map((qt: any) => qt.tags);
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to fetch tags by question');
      throw err;
    }
  };

  return {
    questions,
    tags,
    loading,
    error,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createTag,
    updateTag,
    deleteTag,
    addTagToQuestion,
    removeTagFromQuestion,
    getQuestionsByTag,
    getTagsByQuestion,
  };
} 