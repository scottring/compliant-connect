import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  accent?: "default" | "indigo" | "rose" | "amber" | "cyan" | "violet";
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  subtitle, 
  actions,
  accent = "default"
}) => {
  // Define accent gradient classes based on the accent prop
  const accentClasses = {
    default: "from-primary/20 to-transparent",
    indigo: "from-indigo-500/20 to-transparent",
    rose: "from-rose-500/20 to-transparent",
    amber: "from-amber-500/20 to-transparent",
    cyan: "from-cyan-500/20 to-transparent",
    violet: "from-violet-500/20 to-transparent",
  };

  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.23, 0.86, 0.39, 0.96],
      },
    },
  };

  return (
    <motion.div 
      className="relative"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Subtle gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r opacity-50 rounded-xl -z-10",
        accentClasses[accent]
      )} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between py-8 mb-6 border-b border-border/40 relative overflow-hidden">
        <motion.div variants={itemVariants} className="relative">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <Sparkles className="h-5 w-5 text-primary/60 animate-pulse" />
          </div>
          
          {subtitle && (
            <motion.p 
              variants={itemVariants}
              className="text-muted-foreground mt-1 font-medium"
            >
              {subtitle}
            </motion.p>
          )}
          
          {description && (
            <motion.p 
              variants={itemVariants}
              className="text-muted-foreground mt-1 max-w-md"
            >
              {description}
            </motion.p>
          )}
        </motion.div>
        
        {actions && (
          <motion.div 
            variants={itemVariants}
            className="mt-4 md:mt-0 flex space-x-2 items-center"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </motion.div>
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
  disabled?: boolean;
}> = ({ label, icon, onClick, variant = "default", disabled }) => {
  return (
    <Button 
      variant={variant} 
      onClick={onClick} 
      className="flex items-center transition-all hover:scale-105" 
      disabled={disabled}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
};

// Example usage
const PageHeaderExample = () => {
  return (
    <PageHeader
      title="Dashboard"
      subtitle="Welcome back!"
      description="View and manage your account settings and preferences."
      accent="indigo"
      actions={
        <>
          <PageHeaderAction
            label="New Project"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => console.log("New project")}
          />
          <PageHeaderAction
            label="Settings"
            variant="outline"
            onClick={() => console.log("Settings")}
          />
        </>
      }
    />
  );
};

export default PageHeader;
