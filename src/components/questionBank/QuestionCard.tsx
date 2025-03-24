
import React from "react";
import { Question, Section, Subsection } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import TagBadge from "@/components/tags/TagBadge";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  question: Question;
  sections: Section[];
  subsections: Subsection[];
  onClick?: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, sections, subsections, onClick }) => {
  const getQuestionIdentifier = () => {
    if (!question.sectionId) return "";
    
    const section = sections.find(s => s.id === question.sectionId);
    if (!section) return "";
    
    if (!question.subsectionId) {
      return `${section.order}.${question.order || ""}`;
    }
    
    const subsection = subsections.find(s => s.id === question.subsectionId);
    if (!subsection) return `${section.order}.${question.order || ""}`;
    
    return `${section.order}.${subsection.order}.${question.order || ""}`;
  };

  return (
    <Card 
      className="w-full transition-all duration-200 hover:shadow-md overflow-hidden animate-fade-in"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            {question.sectionId && (
              <Badge variant="outline" className="bg-secondary text-xs">
                {getQuestionIdentifier()}
              </Badge>
            )}
            <CardTitle className="text-base font-semibold truncate">{question.text}</CardTitle>
          </div>
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
