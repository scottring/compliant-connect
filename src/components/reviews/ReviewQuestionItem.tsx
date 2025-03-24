
import React, { useState } from "react";
import { Question, SupplierResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import TagBadge from "@/components/tags/TagBadge";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Flag,
  MessageCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import CommentsThread from "@/components/comments/CommentsThread";

interface ReviewQuestionItemProps {
  question: Question;
  answer: SupplierResponse;
  status: "approved" | "flagged" | "pending";
  note: string;
  onApprove: () => void;
  onFlag: (note: string) => void;
  onUpdateNote: (note: string) => void;
}

const ReviewQuestionItem: React.FC<ReviewQuestionItemProps> = ({
  question,
  answer,
  status,
  note,
  onApprove,
  onFlag,
  onUpdateNote,
}) => {
  const [commentsOpen, setCommentsOpen] = useState(false);
  
  // Format answer value based on type
  const formatAnswerValue = () => {
    if (answer.value === undefined || answer.value === null) {
      return <span className="text-muted-foreground italic">No answer provided</span>;
    }
    
    switch (question.type) {
      case "text":
        return <div className="whitespace-pre-wrap">{answer.value as string}</div>;
      case "number":
        return <div>{answer.value as number}</div>;
      case "boolean":
        return <div>{(answer.value as boolean) ? "Yes" : "No"}</div>;
      case "select":
        return <div>{answer.value as string}</div>;
      case "multi-select":
        return (
          <div className="flex flex-wrap gap-1">
            {(answer.value as string[]).map((value, index) => (
              <Badge key={index} variant="outline">{value}</Badge>
            ))}
          </div>
        );
      case "file":
        return <div className="text-blue-600 underline">{answer.value as string}</div>;
      default:
        return <div>{String(answer.value)}</div>;
    }
  };
  
  const handleSubmitFlag = () => {
    if (!note.trim()) {
      return;
    }
    
    // Call the onFlag callback with the note
    onFlag(note);
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-base">
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <div className="flex gap-1 mt-1">
            {question.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-secondary px-2 py-1 rounded capitalize">
            {question.type}
          </span>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground" 
            onClick={() => setCommentsOpen(!commentsOpen)}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {answer.comments?.length || 0}
          </Button>
        </div>
      </div>
      
      <div className="bg-muted/30 rounded-md p-3">
        {formatAnswerValue()}
      </div>
      
      <div className="flex flex-col space-y-2">
        {status === "flagged" && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-start">
              <Flag className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Flagged for revision</p>
                <p className="text-red-700">{note}</p>
              </div>
            </div>
          </div>
        )}
        
        {status === "approved" ? (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="font-medium text-green-800">Approved</p>
            </div>
          </div>
        ) : (
          <div className="flex space-x-2">
            <div className="flex-1">
              <Textarea 
                placeholder="Add a review note or flag explanation..."
                value={note}
                onChange={(e) => onUpdateNote(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="border-green-500 text-green-700 hover:bg-green-50"
                onClick={onApprove}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button 
                variant="outline" 
                className="border-red-500 text-red-700 hover:bg-red-50"
                onClick={handleSubmitFlag}
                disabled={!note.trim()}
              >
                <Flag className="mr-2 h-4 w-4" />
                Flag
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
        <CollapsibleContent className="border-t pt-4 mt-4">
          <CommentsThread 
            comments={answer.comments || []} 
            answerId={answer.id}
            onAddComment={() => {}} // Not needed for review
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ReviewQuestionItem;
