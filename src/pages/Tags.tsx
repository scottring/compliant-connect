
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Tags = () => {
  const { tags, questions } = useApp();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count questions per tag
  const questionsPerTag = tags.reduce((acc, tag) => {
    acc[tag.id] = questions.filter((q) => q.tags.some((t) => t.id === tag.id)).length;
    return acc;
  }, {} as Record<string, number>);

  const handleTagClick = (tagId: string) => {
    toast.info(`Viewing tag ${tagId}`);
    // In a real application, this would open a modal or navigate to the tag detail page
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags"
        description="Manage compliance tags and regulations"
        actions={
          <PageHeaderAction
            label="Add Tag"
            onClick={() => toast.info("Adding new tag...")}
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
            placeholder="Search tags..."
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <Card key={tag.id} className="animate-fade-in overflow-hidden">
              <div 
                className="h-3"
                style={{ backgroundColor: tag.color }}
              ></div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  ></span>
                  {tag.name}
                </CardTitle>
                <CardDescription>
                  {tag.description || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <span className="font-medium">{questionsPerTag[tag.id] || 0}</span> questions
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleTagClick(tag.id)}
                >
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast.info(`Editing tag ${tag.id}`)}
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex justify-center items-center p-8">
            <p className="text-muted-foreground">No tags found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tags;
