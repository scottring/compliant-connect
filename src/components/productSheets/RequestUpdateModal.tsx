
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tag } from "@/types";
import { mockTags } from "@/data/mockData";
import TagBadge from "@/components/tags/TagBadge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Check, Plus } from "lucide-react";

interface RequestUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: any;
  supplierName: string;
  onSubmit: (sheet: any, additionalTags: string[], comments?: string) => void;
}

const RequestUpdateModal: React.FC<RequestUpdateModalProps> = ({
  isOpen,
  onClose,
  sheet,
  supplierName,
  onSubmit,
}) => {
  const [comments, setComments] = useState("");
  const [selectedAdditionalTags, setSelectedAdditionalTags] = useState<string[]>([]);
  const [includeExisting, setIncludeExisting] = useState(true);
  
  // Get existing tags
  const getExistingTags = (): Tag[] => {
    if (!sheet.tags || !Array.isArray(sheet.tags)) return [];
    
    return sheet.tags.map((tagId: string) => {
      return mockTags.find(t => t.id === tagId) || { id: tagId, name: tagId, color: "#888888" };
    });
  };
  
  // Get available tags (ones not already in the sheet)
  const getAvailableTags = (): Tag[] => {
    const existingTagIds = sheet.tags || [];
    return mockTags.filter(tag => !existingTagIds.includes(tag.id));
  };
  
  const handleToggleTag = (tagId: string) => {
    if (selectedAdditionalTags.includes(tagId)) {
      setSelectedAdditionalTags(selectedAdditionalTags.filter(id => id !== tagId));
    } else {
      setSelectedAdditionalTags([...selectedAdditionalTags, tagId]);
    }
  };
  
  const handleSubmit = () => {
    onSubmit(sheet, selectedAdditionalTags, comments);
  };
  
  const existingTags = getExistingTags();
  const availableTags = getAvailableTags();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Product Sheet Update</DialogTitle>
          <DialogDescription>
            Request an update for the product sheet from {supplierName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label className="font-semibold">Product Name</Label>
            <div>{sheet.name}</div>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox 
                id="include-existing" 
                checked={includeExisting}
                onCheckedChange={(checked) => setIncludeExisting(!!checked)}
              />
              <Label htmlFor="include-existing">Include existing tags</Label>
            </div>
            
            {includeExisting && (
              <div className="mb-2">
                <Label className="text-sm text-muted-foreground mb-1 block">Current tags:</Label>
                <div className="flex flex-wrap gap-1">
                  {existingTags.length > 0 ? (
                    existingTags.map(tag => (
                      <TagBadge key={tag.id} tag={tag} size="sm" />
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">No tags</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <Label className="block mb-1">Add new tags:</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedAdditionalTags.map(tagId => {
                const tag = mockTags.find(t => t.id === tagId);
                return tag ? (
                  <TagBadge 
                    key={tag.id} 
                    tag={tag} 
                    size="sm" 
                    onClick={() => handleToggleTag(tag.id)}
                    selected={true}
                  />
                ) : null;
              })}
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 gap-1">
                    <Plus className="h-3 w-3" /> Add Tag
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2">
                  <div className="space-y-1">
                    {availableTags.length > 0 ? (
                      availableTags.map(tag => (
                        <div 
                          key={tag.id}
                          className="flex items-center gap-2 p-1 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleToggleTag(tag.id)}
                        >
                          {selectedAdditionalTags.includes(tag.id) && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                          <span 
                            className={selectedAdditionalTags.includes(tag.id) ? "ml-4" : "ml-0"}
                          >
                            <TagBadge tag={tag} size="sm" />
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-xs py-1">No more tags available</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div>
            <Label htmlFor="comments">Additional Comments</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any specific instructions or comments for the supplier..."
              className="mt-1"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestUpdateModal;
