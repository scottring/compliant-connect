import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
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
  List, 
  Plus,
  Edit,
  Trash,
  Eye,
  ChevronDown
} from "lucide-react";
import { QuestionBuilderDialog } from "@/components/questionBank/QuestionBuilderDialog";
import { QuestionPreviewDialog } from "@/components/questionBank/QuestionPreviewDialog";

const QuestionBank = () => {
  const { questions, tags, sections, subsections, deleteQuestion } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubsection, setSelectedSubsection] = useState<string | null>(null);
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
      
    const matchesSection = 
      !selectedSection || question.sectionId === selectedSection;
      
    const matchesSubsection = 
      !selectedSubsection || question.subsectionId === selectedSubsection;

    return matchesSearch && matchesTags && matchesSection && matchesSubsection;
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

  const handleDeleteQuestion = (questionId: string) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      deleteQuestion(questionId);
    }
  };

  const getQuestionIdentifier = (question) => {
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

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    const sectionA = sections.find(s => s.id === a.sectionId)?.order || 0;
    const sectionB = sections.find(s => s.id === b.sectionId)?.order || 0;
    
    if (sectionA !== sectionB) {
      return sectionA - sectionB;
    }
    
    const subsectionA = subsections.find(s => s.id === a.subsectionId)?.order || 0;
    const subsectionB = subsections.find(s => s.id === b.subsectionId)?.order || 0;
    
    if (subsectionA !== subsectionB) {
      return subsectionA - subsectionB;
    }
    
    return (a.order || 0) - (b.order || 0);
  });

  return (
    <div className="space-y-6">
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
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
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

      {sections.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center pb-4">
          <span className="text-sm font-medium mr-2">Filter by section:</span>
          <Button 
            variant={selectedSection === null ? "secondary" : "outline"}
            size="sm" 
            onClick={() => {
              setSelectedSection(null);
              setSelectedSubsection(null);
            }}
            className="h-7 text-xs"
          >
            All
          </Button>
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={selectedSection === section.id ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedSection(section.id);
                setSelectedSubsection(null);
              }}
              className="h-7 text-xs"
            >
              {`${section.order}. ${section.name}`}
            </Button>
          ))}
        </div>
      )}

      {selectedSection && (
        <div className="flex flex-wrap gap-2 items-center pb-4">
          <span className="text-sm font-medium mr-2">Filter by subsection:</span>
          <Button 
            variant={selectedSubsection === null ? "secondary" : "outline"}
            size="sm" 
            onClick={() => setSelectedSubsection(null)}
            className="h-7 text-xs"
          >
            All
          </Button>
          {subsections
            .filter(subsection => subsection.sectionId === selectedSection)
            .map((subsection) => {
              const section = sections.find(s => s.id === subsection.sectionId);
              return (
                <Button
                  key={subsection.id}
                  variant={selectedSubsection === subsection.id ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubsection(subsection.id)}
                  className="h-7 text-xs"
                >
                  {`${section?.order}.${subsection.order} ${subsection.name}`}
                </Button>
              );
            })}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">ID</TableHead>
              <TableHead className="w-[50%]">Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedQuestions.length > 0 ? (
              sortedQuestions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="font-mono text-sm">
                    {getQuestionIdentifier(question)}
                  </TableCell>
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
                <TableCell colSpan={6} className="h-24 text-center">
                  <p className="text-muted-foreground">No questions found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <QuestionBuilderDialog 
        open={isBuilderOpen} 
        onOpenChange={setIsBuilderOpen}
        questionId={editingQuestion}
        onClose={handleCloseBuilder}
      />

      <QuestionPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        question={previewQuestion ? questions.find(q => q.id === previewQuestion) || null : null}
      />
    </div>
  );
};

export default QuestionBank;
