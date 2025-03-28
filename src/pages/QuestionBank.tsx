import React, { useState } from "react";
import { useQuestionBankContext } from "@/context/QuestionBankContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TagBadge from "@/components/tags/TagBadge";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus,
  Edit,
  Trash,
  Eye,
  Search,
  List
} from "lucide-react";
import { QuestionBuilderDialog } from "@/components/questionBank/QuestionBuilderDialog";
import { QuestionPreviewDialog } from "@/components/questionBank/QuestionPreviewDialog";
import { Question, Tag } from "@/types";

const QuestionBank = () => {
  const { 
    questions, 
    tags, 
    loading: questionBankLoading,
    deleteQuestion
  } = useQuestionBankContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch =
      searchTerm === "" ||
      question.text.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      question.tags.some((tag) => selectedTags.includes(tag.id));
      
    return matchesSearch && matchesTags;
  });

  const handleOpenBuilder = (questionId?: string) => {
    setEditingQuestion(questionId || null);
    setIsBuilderOpen(true);
  };

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false);
    setEditingQuestion(null);
  };

  const handlePreviewQuestion = (questionId: string) => {
    setPreviewQuestion(questionId);
    setIsPreviewOpen(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      await deleteQuestion(questionId);
    }
  };

  return (
    <>
      <PageHeader
        title="Question Bank"
        description="Manage all compliance questions across different regulations"
        actions={
            <PageHeaderAction
              label="Add Question"
              onClick={() => handleOpenBuilder()}
              icon={<Plus className="h-4 w-4" />}
            />
        }
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <Button variant="outline">
          <List className="h-5 w-5 mr-2" />
          List View
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center pb-4">
        <span className="text-sm font-medium mr-2">Filter by tag:</span>
        {tags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            selected={selectedTags.includes(tag.id)}
            onClick={() => toggleTag(tag.id)}
          />
        ))}
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTags([])}
            className="ml-2 h-7 text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {questionBankLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-2">Loading questions...</span>
        </div>
      ) : (
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
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((question) => (
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handlePreviewQuestion(question.id)}
                          title="Preview Question"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenBuilder(question.id)}
                          title="Edit Question"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-destructive"
                          title="Delete Question"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
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
      )}

      <QuestionBuilderDialog 
        open={isBuilderOpen} 
        onOpenChange={setIsBuilderOpen}
        questionId={editingQuestion}
        onClose={handleCloseBuilder}
      />

      <QuestionPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        question={previewQuestion ? filteredQuestions.find(q => q.id === previewQuestion) || null : null}
      />
    </>
  );
};

export default QuestionBank;
