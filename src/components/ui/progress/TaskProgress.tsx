
import React from "react";
import { Progress } from "@/components/ui/progress";

interface TaskProgressProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const TaskProgress: React.FC<TaskProgressProps> = ({ 
  value, 
  size = "md", 
  showLabel = false 
}) => {
  const height = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  }[size];

  return (
    <div className="w-full flex items-center">
      <Progress 
        value={value} 
        className={`${height} flex-1 bg-gray-200`} 
      />
      {showLabel && (
        <span className="ml-2 text-xs font-medium text-gray-600">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
};

export default TaskProgress;
