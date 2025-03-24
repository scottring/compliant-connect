
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuestionCard from "@/components/questionBank/QuestionCard";
import TagBadge from "@/components/tags/TagBadge";
import { toast } from "sonner";

const QuestionBank = () => {
  const { questions, tags } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const filteredQuestions = questions.filter((question) => {
    // Filter by search term
    const matchesSearch =
      searchTerm === "" ||
      question.text.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by selected tags
    const matchesTags =
      selectedTags.length === 0 ||
      question.tags.some((tag) => selectedTags.includes(tag.id));

    return matchesSearch && matchesTags;
  });

  const handleQuestionClick = (questionId: string) => {
    toast.info(`Viewing question ${questionId}`);
    // In a real application, this would open a modal or navigate to the question detail page
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Manage all compliance questions across different regulations"
        actions={
          <PageHeaderAction
            label="Add Question"
            onClick={() => toast.info("Adding new question...")}
            icon={
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
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
          <svg
            className="h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
          Filter
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onClick={() => handleQuestionClick(question.id)}
            />
          ))
        ) : (
          <div className="col-span-full flex justify-center items-center p-8">
            <p className="text-muted-foreground">No questions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;
