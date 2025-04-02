import React, { useState, useEffect } from "react";
// import { useApp } from "@/context/AppContext"; // Removed useApp
import { useTags } from "@/hooks/use-tags"; // Use React Query hook for tags
import { useQuestionBank } from "@/hooks/use-question-bank"; // Use React Query hook for questions
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tag } from "@/types"; // Import Tag type if needed

const Tags = () => {
  // Use React Query hooks
  const { tags, isLoadingTags, errorTags, addTagMutation, updateTagMutation, deleteTagMutation } = useTags();
  const { questions, isLoadingQuestions } = useQuestionBank(); // Get questions for count

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddTagDialogOpen, setIsAddTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagDescription, setNewTagDescription] = useState("");
  // TODO: Add state for editing a tag if implementing edit functionality
  // const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const filteredTags = (tags ?? []).filter((tag) => // Use tags from useTags, default to []
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate questions per tag using data from useQuestionBank
  const questionsPerTag = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!questions) return counts; // Return empty if questions not loaded

    for (const tag of tags ?? []) {
        counts[tag.id] = questions.filter(q => q.tags.some(t => t.id === tag.id)).length;
    }
    return counts;
  }, [questions, tags]); // Recalculate when questions or tags change

  const handleTagClick = (tagId: string) => {
    toast.info(`Viewing tag ${tagId}`);
    // TODO: Implement view/edit modal or navigation
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      addTagMutation.mutate(
        {
          name: newTagName.trim(),
          description: newTagDescription.trim() || undefined,
          // color: '#ffffff' // Add color if needed and part of TagInput
        },
        {
          onSuccess: () => {
            resetTagForm();
            setIsAddTagDialogOpen(false);
            // Toast is handled in the mutation hook's onSuccess
          },
          // onError handled in mutation hook
        }
      );
    } else {
      toast.error("Tag name is required");
    }
  };

  // TODO: Implement Edit Tag functionality
  const handleEditTag = (tag: Tag) => {
      // setEditingTag(tag);
      // Open edit dialog/modal
      toast.info(`Editing tag ${tag.id} - Functionality not implemented`);
  };

  // TODO: Implement Delete Tag functionality
  const handleDeleteTag = (tagId: string) => {
      // Show confirmation dialog first
      if (window.confirm("Are you sure you want to delete this tag? This might fail if it's used by questions.")) {
          deleteTagMutation.mutate(tagId, {
              // onSuccess/onError handled in hook
          });
      }
  };


  const resetTagForm = () => {
    setNewTagName("");
    setNewTagDescription("");
  };

  const isLoading = isLoadingTags || isLoadingQuestions || addTagMutation.isPending; // Combine loading states

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags"
        description="Manage compliance tags and regulations"
        actions={
          <PageHeaderAction
            label="Add Tag"
            onClick={() => setIsAddTagDialogOpen(true)}
            disabled={isLoading} // Disable while loading
            icon={ <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <path d="M12 5v14M5 12h14" /> </svg> }
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
            disabled={isLoading}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <circle cx="11" cy="11" r="8" /> <path d="m21 21-4.3-4.3" /> </svg>
        </div>
      </div>

      {isLoadingTags ? (
        <div className="text-center p-8">Loading tags...</div>
      ) : errorTags ? (
        <div className="text-center p-8 text-red-500">Error loading tags: {errorTags.message}</div>
      ) : filteredTags.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map((tag) => (
            <Card key={tag.id} className="animate-fade-in overflow-hidden">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center">
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
                <Button variant="ghost" size="sm" onClick={() => handleTagClick(tag.id)}>
                  View Details
                </Button>
                {/* Add Edit/Delete buttons */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditTag(tag)}> Edit </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTag(tag.id)} disabled={deleteTagMutation.isPending}> Delete </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="col-span-full flex justify-center items-center p-8">
          <p className="text-muted-foreground">No tags found {searchTerm && 'matching search'}</p>
        </div>
      )}

      {/* Add Tag Dialog */}
      <Dialog open={isAddTagDialogOpen} onOpenChange={setIsAddTagDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagName" className="text-right"> Name </Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name"
                className="col-span-3"
                disabled={addTagMutation.isPending}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagDescription" className="text-right"> Description </Label>
              <Input
                id="tagDescription"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                placeholder="Enter tag description (optional)"
                className="col-span-3"
                disabled={addTagMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetTagForm(); setIsAddTagDialogOpen(false); }} disabled={addTagMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleAddTag} disabled={!newTagName.trim() || addTagMutation.isPending}>
              {addTagMutation.isPending ? "Creating..." : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TODO: Add Edit Tag Dialog */}

    </div>
  );
};

export default Tags;
