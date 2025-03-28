import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const Tags = () => {
  const { tags, questions, addTag, updateTag, refreshTags, dbTags, tagsLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddTagDialogOpen, setIsAddTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [newTagDescription, setNewTagDescription] = useState("");
  const [directDbTags, setDirectDbTags] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    // Direct database query for debugging
    const fetchTagsDirectly = async () => {
      setDbLoading(true);
      try {
        const { data, error } = await supabase.from('tags').select('*');
        if (error) {
          console.error("Direct query error:", error);
          toast.error("Failed to directly query tags");
        } else {
          console.log("Tags directly from DB:", data);
          setDirectDbTags(data || []);
        }
      } catch (err) {
        console.error("Error in direct query:", err);
      } finally {
        setDbLoading(false);
      }
    };
    
    fetchTagsDirectly();
  }, []);

  // Debug function to force refresh
  const handleForceRefresh = async () => {
    toast.info("Forcing tags refresh...");
    await refreshTags();
    // Also refresh direct query
    const { data } = await supabase.from('tags').select('*');
    setDirectDbTags(data || []);
  };

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

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        name: newTagName.trim(),
        color: newTagColor,
        description: newTagDescription.trim() || undefined,
      };

      addTag(newTag);
      resetTagForm();
      setIsAddTagDialogOpen(false);
      toast.success("Tag added successfully");
    } else {
      toast.error("Tag name is required");
    }
  };

  const resetTagForm = () => {
    setNewTagName("");
    setNewTagColor("#3B82F6");
    setNewTagDescription("");
  };

  return (
    <div className="space-y-6">
      {/* Debug Panel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-yellow-800">Tag Debug Panel</h3>
          <Button variant="outline" onClick={handleForceRefresh} disabled={tagsLoading || dbLoading}>
            {(tagsLoading || dbLoading) ? 'Refreshing...' : 'Force Refresh Tags'}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-1">App Context Tags ({tags.length}):</h4>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(tags, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Direct DB Tags ({directDbTags.length}):</h4>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(directDbTags, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-1">DB Tags from Context ({dbTags?.length || 0}):</h4>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(dbTags, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">State:</h4>
            <ul className="bg-white p-2 rounded text-xs">
              <li>Tags Loading: {tagsLoading ? 'Yes' : 'No'}</li>
              <li>DB Direct Loading: {dbLoading ? 'Yes' : 'No'}</li>
              <li>Filtered Tags Count: {filteredTags.length}</li>
            </ul>
          </div>
        </div>
      </div>

      <PageHeader
        title="Tags"
        description="Manage compliance tags and regulations"
        actions={
          <PageHeaderAction
            label="Add Tag"
            onClick={() => setIsAddTagDialogOpen(true)}
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

      {/* Add Tag Dialog */}
      <Dialog open={isAddTagDialogOpen} onOpenChange={setIsAddTagDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagName" className="text-right">
                Name
              </Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagColor" className="text-right">
                Color
              </Label>
              <div className="col-span-3 flex space-x-2 items-center">
                <Input
                  id="tagColor"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <span className="flex-1 py-1">{newTagColor}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagDescription" className="text-right">
                Description
              </Label>
              <Input
                id="tagDescription"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                placeholder="Enter tag description (optional)"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                resetTagForm();
                setIsAddTagDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tags;
