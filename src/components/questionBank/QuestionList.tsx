import React, { useState, useEffect, useMemo } from "react";
import { DBQuestion } from "@/hooks/use-question-bank";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash, GripVertical } from "lucide-react";
import TagBadge from "@/components/tags/TagBadge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface QuestionListProps {
  questions: DBQuestion[];
  onEditQuestion: (id: string) => void;
  onPreviewQuestion: (id: string) => void;
  onDeleteQuestion: (id: string) => Promise<boolean>;
  // Add a handler for when the order changes via drag-and-drop
  // Pass active and over IDs for the parent to calculate the final order
  onOrderChange: (activeId: string, overId: string, sectionId: string) => void;
}

// New Sortable Row Component
const SortableQuestionRow = ({ question, onPreviewQuestion, onEditQuestion, onDeleteQuestion }: {
  question: DBQuestion;
  onEditQuestion: (id: string) => void;
  onPreviewQuestion: (id: string) => void;
  onDeleteQuestion: (id: string) => Promise<boolean>;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto', // Ensure dragged item is on top
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes} data-testid={`question-row-${question.id}`}>
      <TableCell className="w-[40px] cursor-grab touch-none" {...listeners} title="Drag to reorder">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </TableCell>
      <TableCell className="w-[80px] font-mono text-xs text-muted-foreground">{question.hierarchical_number}</TableCell>
      <TableCell className="font-medium">{question.text}</TableCell>
      <TableCell><Badge variant="outline" className="bg-secondary capitalize">{question.type}</Badge></TableCell>
      <TableCell>{question.required ? (<Badge className="bg-red-100 text-red-800 border-red-200">Required</Badge>) : (<Badge variant="outline" className="bg-gray-100">Optional</Badge>)}</TableCell>
      <TableCell><div className="flex flex-wrap gap-1">{question.tags.map((tag) => (<TagBadge key={tag.id} tag={tag} size="sm" />))}</div></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end space-x-1">
          {onPreviewQuestion && (<Button variant="ghost" size="icon" onClick={() => onPreviewQuestion(question.id)} title="Preview Question"><Eye className="h-4 w-4" /></Button>)}
          {onEditQuestion && (<Button variant="ghost" size="icon" onClick={() => onEditQuestion(question.id)} title="Edit Question"><Edit className="h-4 w-4" /></Button>)}
          {onDeleteQuestion && (<Button variant="ghost" size="icon" onClick={() => onDeleteQuestion(question.id)} className="text-destructive" title="Delete Question"><Trash className="h-4 w-4" /></Button>)}
        </div>
      </TableCell>
    </TableRow>
  );
};


export const QuestionList = ({
  questions: initialQuestions, // Rename prop
  onEditQuestion,
  onPreviewQuestion,
  onDeleteQuestion,
  onOrderChange,
}: QuestionListProps) => {
  const [questions, setQuestions] = useState<DBQuestion[]>(initialQuestions);

  // Update local state if initial questions change (e.g., after filtering)
  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group questions by section_id
  const groupedQuestions = useMemo(() => {
    // Default to empty array if questions is undefined or null
    const safeQuestions = questions || [];
    
    return safeQuestions.reduce((acc, question) => {
      // Handle potential nulls in question properties
      const sectionId = question.section_id || 'unsectioned'; // Group questions without a section
      if (!acc[sectionId]) {
        acc[sectionId] = { 
          name: question.section_name || 'Unsectioned Questions', 
          questions: [] 
        };
      }
      acc[sectionId].questions.push(question);
      // Ensure questions within a section are sorted by their current order_index or hierarchical number
      acc[sectionId].questions.sort((a, b) => {
        // Prefer order_index if available and consistent, otherwise fallback to hierarchical number
        const orderA = a.order_index ?? parseFloat(a.hierarchical_number?.split('.').pop() || '0');
        const orderB = b.order_index ?? parseFloat(b.hierarchical_number?.split('.').pop() || '0');
        return orderA - orderB;
      });
      return acc;
    }, {} as Record<string, { name: string; questions: DBQuestion[] }>);
  }, [questions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // If no drag over target or empty data, do nothing
    if (!over || !active.id || !over.id || Object.keys(groupedQuestions).length === 0) {
      return;
    }

    if (active.id !== over.id) {
      // Find the section the active item belongs to
      let activeSectionId: string | null = null;
      let overSectionId: string | null = null;
      let activeItemIndex = -1;
      let overItemIndex = -1;

      Object.entries(groupedQuestions).forEach(([sectionId, group]) => {
          // Ensure questions array exists and is not null
          const questions = group.questions || [];
          const activeIndexInSection = questions.findIndex(q => q.id === active.id);
          const overIndexInSection = questions.findIndex(q => q.id === over.id);

          if (activeIndexInSection !== -1) {
              activeSectionId = sectionId;
              activeItemIndex = activeIndexInSection;
          }
          if (overIndexInSection !== -1) {
              overSectionId = sectionId;
              overItemIndex = overIndexInSection;
          }
      });

      // Only allow reordering within the same section
      if (activeSectionId && overSectionId && activeSectionId === overSectionId && activeItemIndex !== -1 && overItemIndex !== -1) {
          setQuestions((prevQuestions) => {
              // Create a new array reflecting the change within the specific section
              const sectionQuestions = groupedQuestions[activeSectionId!].questions || [];
              const newSectionOrder = arrayMove(sectionQuestions, activeItemIndex, overItemIndex);

              // Create a map of the new order for the affected section
              const newOrderMap = new Map(newSectionOrder.map((q, index) => [q.id, index]));

              // Update the main questions array
              const updatedQuestions = prevQuestions.map(q => {
                  if (q.section_id === activeSectionId || (!q.section_id && activeSectionId === 'unsectioned')) {
                      const newIndex = newOrderMap.get(q.id);
                      // Return a new object only if the index changed to avoid unnecessary re-renders
                      // Note: We are not updating order_index here, just the array order for UI
                      return newIndex !== undefined ? newSectionOrder[newIndex] : q;
                  }
                  return q;
              }).sort((a, b) => { // Re-sort based on section and new index if applicable
                  const sectionA = a.section_id || 'unsectioned';
                  const sectionB = b.section_id || 'unsectioned';
                  if (sectionA !== sectionB) {
                      // Basic section sorting (can be improved if sections themselves need ordering)
                      return (a.section_name || '').localeCompare(b.section_name || '');
                  }
                  // Sort within the section based on the new order map
                  const indexA = newOrderMap.get(a.id) ?? prevQuestions.findIndex(pq => pq.id === a.id);
                  const indexB = newOrderMap.get(b.id) ?? prevQuestions.findIndex(pq => pq.id === b.id);
                  return indexA - indexB;
              });

              return updatedQuestions;
          });

          // Call the callback to notify the parent about the change for persistence
          onOrderChange(active.id as string, over.id as string, activeSectionId);
      } else {
          console.warn("Cannot move questions between different sections.");
          // Optionally provide user feedback here (e.g., a toast)
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {Object.entries(groupedQuestions).length === 0 ? (
          <div className="rounded-md border p-10 text-center">
            <p className="text-muted-foreground">No questions match the current filters.</p>
          </div>
        ) : (
          Object.entries(groupedQuestions).map(([sectionId, group]) => (
            <div key={sectionId} className="rounded-md border">
              <h3 className="text-lg font-semibold p-4 border-b bg-muted/40">
                {group.name} ({(group.questions || []).length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">Number</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext
                  items={Array.isArray(group.questions) ? group.questions.map(q => q.id).filter(Boolean) : []}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {Array.isArray(group.questions) && group.questions.length > 0 ? (
                      group.questions.map((question) => (
                        <SortableQuestionRow
                          key={question.id}
                          question={question}
                          onEditQuestion={onEditQuestion}
                          onPreviewQuestion={onPreviewQuestion}
                          onDeleteQuestion={onDeleteQuestion}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <p className="text-muted-foreground">No questions found in this section</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </SortableContext>
              </Table>
            </div>
          ))
        )}
      </div>
    </DndContext>
  );
}