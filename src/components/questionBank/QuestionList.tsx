import React from "react";
import { DBQuestion, Section, Subsection } from "@/hooks/use-question-bank";
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
import { Edit, Eye, Trash } from "lucide-react";
import TagBadge from "@/components/tags/TagBadge";

export interface QuestionListProps {
  questions: DBQuestion[];
  sections: Section[];
  subsections: Subsection[];
  onEditQuestion: (id: string) => void;
  onPreviewQuestion: (id: string) => void;
  onDeleteQuestion: (id: string) => Promise<boolean>;
}

export const QuestionList = ({
  questions,
  sections,
  subsections,
  onEditQuestion,
  onPreviewQuestion,
  onDeleteQuestion
}: QuestionListProps) => {
  return (
    <div className="rounded-md border">
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
          {questions.length > 0 ? (
            questions.map((question) => (
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
                  <div className="flex justify-end space-x-2">
                    {onPreviewQuestion && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPreviewQuestion(question.id)}
                        title="Preview Question"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEditQuestion && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditQuestion(question.id)}
                        title="Edit Question"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDeleteQuestion && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteQuestion(question.id)}
                        className="text-destructive"
                        title="Delete Question"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <p className="text-muted-foreground">No questions found</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 