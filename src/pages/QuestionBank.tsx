import React, { useState } from "react";
import { useQuestionBankContext } from "@/context/QuestionBankContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { QuestionBuilderDialog } from "@/components/questionBank/QuestionBuilderDialog";
import { QuestionPreviewDialog } from "@/components/questionBank/QuestionPreviewDialog";
import { Tag } from "@/types";
import { QuestionList } from "@/components/questionBank/QuestionList";
import { TagSelector } from "@/components/questionBank/TagSelector";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const QuestionBank = () => {
  const { 
    questions,
    tags,
    sections,
    subsections,
    isLoadingQuestions,
    isLoadingTags,
    isLoadingStructure,
    errorQuestions,
    errorTags,
    errorStructure,
    deleteQuestion,
    addSection
  } = useQuestionBankContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentSubsectionId, setCurrentSubsectionId] = useState("");
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const toggleTag = (tagId: string) => {
    if (selectedTags.some((tag) => tag.id === tagId)) {
      setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tags.find(t => t.id === tagId) as Tag]);
    }
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch =
      searchTerm === "" ||
      question.text.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) =>
        question.tags.some((questionTag) => questionTag.id === tag.id)
      );
      
    return matchesSearch && matchesTags;
  });

  const handleOpenDialog = () => {
    if (!sections || sections.length === 0) {
      setIsAddingSectionOpen(true);
      return;
    }
    setIsDialogOpen(true);
  };

  const handleCreateSection = async () => {
    if (newSectionName.trim()) {
      try {
        await addSection({
          name: newSectionName.trim(),
          description: "",
          order_index: sections.length
        });
        setNewSectionName("");
        setIsAddingSectionOpen(false);
        setIsDialogOpen(true); // Open question dialog after creating section
        toast.success("Section created successfully");
      } catch (error) {
        toast.error("Failed to create section");
      }
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestion(id);
      toast.success("Question deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
      return false;
    }
  };

  const isLoading = isLoadingQuestions || isLoadingTags || isLoadingStructure;
  const hasError = errorQuestions || errorTags || errorStructure;

  if (hasError) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading question bank: {errorQuestions?.message || errorTags?.message || errorStructure?.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Manage and organize your compliance questions"
        actions={
          <PageHeaderAction
            label="Add Question"
            onClick={handleOpenDialog}
            disabled={isLoading}
            icon={<Plus className="h-4 w-4" />}
          />
        }
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <TagSelector
          tags={tags}
          selectedTags={selectedTags}
          onTagClick={toggleTag}
          disabled={isLoading}
        />
      </div>

      {isLoading ? (
        <div className="text-center p-8">Loading question bank...</div>
      ) : (
        <QuestionList
          questions={filteredQuestions}
          sections={sections}
          subsections={subsections}
          onEditQuestion={(id) => {
            setEditingQuestion(id);
            setIsDialogOpen(true);
          }}
          onPreviewQuestion={(id) => {
            setPreviewQuestion(id);
            setIsPreviewOpen(true);
          }}
          onDeleteQuestion={handleDeleteQuestion}
        />
      )}

      <QuestionBuilderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        questionId={editingQuestion}
        onClose={() => {
          setEditingQuestion(null);
          setIsDialogOpen(false);
        }}
        subsectionId={currentSubsectionId}
      />

      <QuestionPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        questionId={previewQuestion}
        onClose={() => {
          setPreviewQuestion(null);
          setIsPreviewOpen(false);
        }}
      />

      {/* Add Section Dialog */}
      <Dialog open={isAddingSectionOpen} onOpenChange={setIsAddingSectionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Your First Section</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sectionName">Section Name</Label>
              <Input
                id="sectionName"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Enter section name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSection}>Create Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
