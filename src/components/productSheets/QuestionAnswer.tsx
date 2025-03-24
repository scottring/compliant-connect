
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Question, Answer } from "@/types";
import { Badge } from "@/components/ui/badge";
import TagBadge from "@/components/tags/TagBadge";
import CommentThread from "./CommentThread";

interface QuestionAnswerProps {
  question: Question;
  answer?: Answer;
}

const QuestionAnswer: React.FC<QuestionAnswerProps> = ({ question, answer }) => {
  const renderAnswerValue = (answer?: Answer) => {
    if (!answer) return "Not answered yet";
    
    const value = answer.value;
    
    switch (question.type) {
      case "boolean":
        return typeof value === "boolean" ? (value ? "Yes" : "No") : "Invalid answer";
      case "text":
        return typeof value === "string" ? value : "Invalid answer";
      case "number":
        return typeof value === "number" ? value.toString() : "Invalid answer";
      case "select":
        return typeof value === "string" ? value : "Invalid answer";
      case "multi-select":
        return Array.isArray(value) ? value.join(", ") : "Invalid answer";
      case "table":
        return "Table data"; // Table would need a custom renderer
      default:
        return "Unknown answer type";
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm">{question.text}</h3>
              <CommentThread 
                questionId={question.id} 
                questionText={question.text} 
                answerId={answer?.id}
                answerValue={answer?.value}
              />
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {question.tags.map(tag => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
            
            <div className="mt-2 p-3 bg-muted/30 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Answer:</span>
                <Badge variant={answer ? "default" : "outline"} className="text-xs">
                  {answer ? "Answered" : "Pending"}
                </Badge>
              </div>
              <p className="mt-1">{renderAnswerValue(answer)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionAnswer;
