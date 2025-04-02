import React from "react";
import { DBQuestion } from "@/hooks/use-question-bank";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import TagBadge from "@/components/tags/TagBadge";
import QuestionItem from "@/components/supplierResponse/QuestionItem";
import { useQuestionBankContext } from "@/context/QuestionBankContext";

export interface QuestionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | null;
  onClose: () => void;
}

export const QuestionPreviewDialog = ({
  open,
  onOpenChange,
  questionId,
  onClose
}: QuestionPreviewDialogProps) => {
  const { questions } = useQuestionBankContext();
  const question = questionId ? questions.find(q => q.id === questionId) : null;

  if (!question) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Question Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-secondary capitalize">
              {question.type}
            </Badge>
            {question.required ? (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                Required
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-100">
                Optional
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {question.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>

          <div className="border rounded-lg p-4">
            <QuestionItem
              question={question}
              answer={null}
              productSheetId=""
              onAnswerUpdate={() => {}}
              onAddComment={() => {}}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
