import React, { useState } from "react"; // Import useState
import { DBQuestion, Section, Subsection } from "@/hooks/use-question-bank";
import {
  AlertDialog, // Import AlertDialog components
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Edit, Eye, Trash, Plus } from "lucide-react"; // Import Plus
import TagBadge from "@/components/tags/TagBadge";
import { useQuestionBankContext } from "@/context/QuestionBankContext"; // Import context to get delete functions

export interface QuestionListProps {
  questions: DBQuestion[];
  sections: Section[];
  subsections: Subsection[];
  onEditQuestion: (id: string) => void;
  onPreviewQuestion: (id: string) => void;
  onDeleteQuestion: (id: string) => Promise<boolean>;
  // Add delete functions for sections/subsections
  onDeleteSection: (id: string) => Promise<boolean>;
  onDeleteSubsection: (id: string) => Promise<boolean>;
}

export const QuestionList = ({
  questions,
  sections,
  subsections,
  onEditQuestion,
  onPreviewQuestion,
  onDeleteQuestion,
  onDeleteSection,
  onDeleteSubsection,
}: QuestionListProps) => {
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'section' | 'subsection' | 'question' } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDeleteClick = (id: string, type: 'section' | 'subsection' | 'question') => {
    setItemToDelete({ id, type });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    let success = false;
    if (itemToDelete.type === 'section') {
      success = await onDeleteSection(itemToDelete.id);
    } else if (itemToDelete.type === 'subsection') {
      success = await onDeleteSubsection(itemToDelete.id);
    } else {
      success = await onDeleteQuestion(itemToDelete.id);
    }

    if (success) {
      setItemToDelete(null);
      setIsConfirmOpen(false);
      // Success toast is handled by the hook
    } else {
      // Error toast is handled by the hook
    }
  };

  const getConfirmationMessage = () => {
    if (!itemToDelete) return { title: "", description: "" };
    if (itemToDelete.type === 'section') {
      return {
        title: "Delete Section?",
        description: "This will permanently delete the section and all subsections and questions within it. This action cannot be undone."
      };
    }
    if (itemToDelete.type === 'subsection') {
      return {
        title: "Delete Subsection?",
        description: "This will permanently delete the subsection and all questions within it. This action cannot be undone."
      };
    }
    return {
      title: "Delete Question?",
      description: "This will permanently delete the question. This action cannot be undone."
    };
  };

  const { title: confirmTitle, description: confirmDescription } = getConfirmationMessage();

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const sectionSubsections = subsections.filter(sub => sub.section_id === section.id);
        return (
          <div key={section.id} className="rounded-md border p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">{section.name}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(section.id, 'section')}
                className="text-destructive hover:bg-destructive/10"
                title="Delete Section"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>

            {sectionSubsections.length > 0 ? (
              sectionSubsections.map((subsection) => {
                const subsectionQuestions = questions.filter(q => q.subsection_id === subsection.id);
                return (
                  <div key={subsection.id} className="ml-4 pl-4 border-l space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-lg font-medium">{subsection.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(subsection.id, 'subsection')}
                        className="text-destructive hover:bg-destructive/10"
                        title="Delete Subsection"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>

                    {subsectionQuestions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Required</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subsectionQuestions.map((question) => (
                            <TableRow key={question.id}>
                              <TableCell className="font-medium">{question.text}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-secondary capitalize">
                                  {question.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {question.required ? (
                                  <Badge className="bg-red-100 text-red-800 border-red-200">
                                    Required
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100">
                                    Optional
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {question.tags.map((tag) => (
                                    <TagBadge key={tag.id} tag={tag} size="sm" />
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onPreviewQuestion(question.id)}
                                    title="Preview Question"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEditQuestion(question.id)}
                                    title="Edit Question"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(question.id, 'question')}
                                    className="text-destructive hover:bg-destructive/10"
                                    title="Delete Question"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-2">No questions in this subsection.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground pl-4">No subsections in this section.</p>
            )}
          </div>
        );
      })}

      {sections.length === 0 && (
         <div className="rounded-md border p-8 text-center">
           <p className="text-muted-foreground">No sections or questions found. Click "Add Question" to get started.</p>
         </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
