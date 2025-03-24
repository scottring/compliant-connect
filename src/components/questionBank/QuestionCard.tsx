
import React from "react";
import { Question } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import TagBadge from "@/components/tags/TagBadge";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  question: Question;
  onClick?: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onClick }) => {
  return (
    <Card 
      className="w-full transition-all duration-200 hover:shadow-md overflow-hidden animate-fade-in"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold truncate">{question.text}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center">
          <Badge variant="outline" className="bg-secondary">
            {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
          </Badge>
          {question.required && (
            <Badge variant="secondary" className="ml-2 bg-red-100 text-red-800 border-red-200">
              Required
            </Badge>
          )}
        </div>
        
        {question.type === 'select' || question.type === 'multi-select' ? (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground mb-1">Options:</p>
            <div className="flex flex-wrap gap-1">
              {question.options?.map((option, index) => (
                <Badge key={index} variant="outline" className="bg-gray-100">
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="pt-1 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
        </div>
      </CardFooter>
    </Card>
  );
};

export default QuestionCard;
