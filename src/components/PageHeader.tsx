
import React from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="mt-4 md:mt-0 flex space-x-2 items-center">{actions}</div>}
    </div>
  );
};

export const PageHeaderAction: React.FC<{
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}> = ({ label, icon, onClick, variant = "default" }) => {
  return (
    <Button variant={variant} onClick={onClick} className="flex items-center">
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
};

export default PageHeader;
