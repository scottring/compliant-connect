import React from "react";
import { Tag } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: Tag;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "default";
}

export function TagBadge({
  tag,
  selected = false,
  onClick,
  size = "default",
}: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer transition-colors",
        selected
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-secondary",
        size === "sm" && "text-xs py-0 px-2"
      )}
      onClick={onClick}
    >
      {tag.name}
    </Badge>
  );
} 