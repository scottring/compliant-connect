
import React from "react";
import { Tag } from "@/types";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: Tag;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  selected?: boolean;
}

const TagBadge: React.FC<TagBadgeProps> = ({ 
  tag, 
  size = "md", 
  onClick,
  selected = false
}) => {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all",
        sizeClasses[size],
        onClick ? "cursor-pointer hover:opacity-80" : "",
        selected 
          ? "ring-2 ring-offset-1"
          : "ring-0"
      )}
      style={{ 
        backgroundColor: `${tag.color}20`, // Apply 20% opacity to the tag color
        color: tag.color,
        borderColor: tag.color,
        borderWidth: "1px",
        borderStyle: "solid",
        // Remove the ringColor property and use CSS classes for ring color
      }}
      onClick={onClick}
    >
      {tag.name}
    </span>
  );
};

export default TagBadge;
