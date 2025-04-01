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

  const style = {
    backgroundColor: selected ? '#e2e8f0' : '#f8fafc', // Light gray when selected, lighter gray when not
    color: '#1e293b', // Dark gray text
    borderColor: '#cbd5e1', // Medium gray border
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium border ${
        selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
      }`}
      style={style}
    >
      {tag.name}
    </button>
  );
};

export default TagBadge;
