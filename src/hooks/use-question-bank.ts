import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Correct import path
import { useAuth } from '@/context/AuthContext';
import { Question, Tag, Section, Subsection } from '@/types';
import { toast } from 'sonner';

export type QuestionSection = {
  id: string;
  name: string;
  description: string | null;
  parent_section_id: string | null;
  created_at: string;
  updated_at: string;
  order?: number | null;
};

export type QuestionType = 'text' | 'number' | 'boolean' | 'single_choice' | 'multiple_choice' | 'file_upload';

export type DBQuestion = {
  id: string;
  section_id: string; // Correct column name
  title: string;
  description: string | null;
  type: QuestionType;
  is_required: boolean;
  options: any | null;
  validation_rules: any | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};

interface QuestionTagJoin {
  question_id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    color: string;
    description: string | null;
  };
}

export const useQuestionBank = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DBQuestion[]>([]);
  const [sections, setSections] = useState<QuestionSection[]>([]);

  // Load questions
  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*');

      if (error) throw error;
      
      // Get all question IDs
      const questionIds = data?.map(q => q.id) || [];
      
      // Load tags for these questions if we have any questions
      if (questionIds.length > 0) {
        try {
          // Get all question-tag relations
          const { data: tagsData, error: tagsError } = await supabase
            .from('question_tags')
            .select(`
              question_id,
              tags (
                id, name, color, description
              )
            `)
            .in('question_id', questionIds);
          
          if (tagsError) throw tagsError;
          
          // Create a map of question_id -> tags array
          const questionTagsMap = new Map<string, Tag[]>();
          
          // Process each relation
          for (const item of tagsData || []) {
            if (!item.tags || !item.question_id) continue;
            
            const questionId = item.question_id;
            
            // Create tag object from data - Cast item.tags to any to bypass TS error
            const tagData = item.tags as any; 
            const tag: Tag = {
              id: tagData.id,
              name: tagData.name,
              color: tagData.color,
              description: tagData.description || undefined
            };
            
            // Add to map
            if (!questionTagsMap.has(questionId)) {
              questionTagsMap.set(questionId, []);
            }
            
            questionTagsMap.get(questionId)?.push(tag);
          }
          
          // Attach tags to each question
          for (const question of data || []) {
            question.tags = questionTagsMap.get(question.id) || [];
          }
        } catch (tagErr) {
          console.error('Error loading question tags:', tagErr);
          // Continue with questions even if tag loading fails
        }
      }
      
      setQuestions(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading questions:', err);
      setError(err.message);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  // Load sections (categories)
  const loadSections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sections') // Correct table name
        .select('*');

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
  };

  // Add a question
  const addQuestion = async (question: Omit<DBQuestion, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error('You must be logged in to add questions');
      return null;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .insert({
          ...question,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setQuestions(prev => [...prev, data]);
      toast.success('Question added successfully');
      return data;
    } catch (err: any) {
      console.error('Error adding question:', err);
      setError(err.message);
      toast.error('Failed to add question');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a question
  const updateQuestion = async (id: string, updates: Partial<Omit<DBQuestion, 'id' | 'created_by' | 'created_at' | 'updated_at'>>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setQuestions(prev => prev.map(q => q.id === id ? data : q));
      toast.success('Question updated successfully');
      return data;
    } catch (err: any) {
      console.error('Error updating question:', err);
      setError(err.message);
      toast.error('Failed to update question');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a question
  const deleteQuestion = async (id: string) => {
    try {
      setLoading(true);
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
  // Add a section
  const addSection = async (section: Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>) => {
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
          order: section.order || null,
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
  const updateSection = async (id: string, updates: Partial<Omit<QuestionSection, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      setLoading(true);
      // Ensure we're not sending undefined values
      const cleanUpdates = {
        name: updates.name,
        description: updates.description,
        parent_section_id: updates.parent_section_id,
        order: updates.order,
      };
      
      // Remove undefined properties
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === undefined) {
          delete cleanUpdates[key];
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
  const deleteSection = async (id: string) => {
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

  // Load data on mount
  useEffect(() => {
    loadQuestions();
    loadSections();
  }, []);

  return {
    questions,
    sections,
    loading,
    error,
    loadQuestions,
    loadSections,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    addSection,
    updateSection,
    deleteSection,
  };
};
