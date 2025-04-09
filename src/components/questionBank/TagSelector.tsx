import React from "react";
import { Tag } from "../../types/index"; // Use explicit relative path
import { Button } from "@/components/ui/button";
import TagBadge from "@/components/tags/TagBadge";

export interface TagSelectorProps {
  tags: Tag[];
  selectedTags: Tag[];
  onTagClick: (tagId: string) => void;
  disabled?: boolean;
}

export const TagSelector = ({ tags, selectedTags, onTagClick, disabled }: TagSelectorProps) => {
  const toggleTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) {
      onTagClick(tag.id);
    } else {
      onTagClick(tag.id);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium mr-2">Filter by tag:</span>
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          selected={selectedTags.some((t) => t.id === tag.id)}
          onClick={() => toggleTag(tag)}
        />
      ))}
      {selectedTags.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTagClick("")}
          className="ml-2 h-7 text-xs"
        >
          Clear
        </Button>
      )}
    </div>
  );
}; 