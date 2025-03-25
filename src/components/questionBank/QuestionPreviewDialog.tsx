
import React from "react";
import { Question } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QuestionItem from "@/components/supplierResponse/QuestionItem";
import { Card, CardContent } from "@/components/ui/card";

interface QuestionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
}

export function QuestionPreviewDialog({
  open,
  onOpenChange,
  question
}: QuestionPreviewDialogProps) {
  // Create a mock answer object to pass to QuestionItem
  const mockAnswer = question ? {
    id: "preview-answer-id",
    questionId: question.id,
    value: undefined,
    comments: [],
    flags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } : null;

  // Dummy handlers that don't actually update anything
  const handleAnswerUpdate = (value: any) => {
    console.log("Answer updated:", value);
  };

  const handleAddComment = (text: string) => {
    console.log("Comment added:", text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Question Preview</DialogTitle>
          <DialogDescription>
            This is how the question will appear to suppliers responding to your information request.
          </DialogDescription>
        </DialogHeader>
        {question && (
          <Card className="border-dashed border-2">
            <CardContent className="pt-6">
              <QuestionItem
                question={question}
                answer={mockAnswer}
                productSheetId="preview"
                onAnswerUpdate={handleAnswerUpdate}
                onAddComment={handleAddComment}
              />
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
