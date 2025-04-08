import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext"; // Changed from useApp
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  LayoutDashboard,
  Users,
  Building,
  FileText,
  HelpCircle,
  Tag,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import UserSwitcher from "./UserSwitcher"; // Import UserSwitcher

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, collapsed }) => {
  return (
    <NavLink to={to}>
      {({ isActive }) => ( // Use function as child to get isActive
        <div // Apply classes to this div instead of NavLink directly
          className={cn(
            "relative flex items-center px-4 py-2.5 my-0.5 rounded-lg transition-all duration-200 group", // Reduced vertical margin to my-0.5
            "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground", // Adjusted hover
            isActive
              ? "bg-sidebar-primary/10 font-semibold text-sidebar-primary" // Subtle background highlight, keep font-semibold
              : "text-sidebar-foreground",
            collapsed ? "justify-center" : "justify-start"
            // Removed underline pseudo-element
          )}
        >
          {/* Rounded icon container - isActive is now in scope */}
          <span className={cn(
            "flex items-center justify-center h-7 w-7 rounded-full transition-colors duration-200",
            // Slightly stronger icon background on active
            isActive ? "bg-sidebar-primary/20 text-sidebar-primary" : "bg-sidebar-accent/50 text-sidebar-foreground group-hover:bg-sidebar-accent/80"
          )}>
            {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4" })} 
          </span>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
              className="ml-2 font-medium"
            >
              {label}
            </motion.span>
          )}
        </div> // Closing div tag was missing
      )}
    </NavLink> // Closing NavLink tag was missing
  );
};

interface SidebarNavGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsed: boolean;
}

const SidebarNavGroup: React.FC<SidebarNavGroupProps> = ({ title, icon, children, collapsed }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center px-4 py-2.5 rounded-lg text-sidebar-foreground group", // Increased padding, added group
          "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground transition-all duration-200", // Adjusted hover
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center">
           {/* Rounded icon container */}
           <span className="flex items-center justify-center h-7 w-7 rounded-full bg-sidebar-accent/50 text-sidebar-foreground group-hover:bg-sidebar-accent/80 transition-colors duration-200">
             {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4" })}
           </span>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-2 font-medium"
            >
              {title}
            </motion.span>
          )}
        </div>
        {!collapsed && (
          <motion.span 
            initial={{ rotate: isOpen ? 180 : 0 }}
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="text-sidebar-foreground/70"
          >
            <ChevronUp className="h-4 w-4" />
          </motion.span>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && !collapsed && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="pl-4 mt-1 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const { user } = useAuth(); // Changed from useApp
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ 
        width: collapsed ? "4rem" : "16rem",
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
      className={cn(
        "h-screen flex flex-col bg-sidebar py-4 border-r border-border relative",
        "shadow-sm"
      )}
    >
      {/* Added pt-4 for top padding */}
      <div className="px-4 pt-4 flex items-center mb-6 justify-center"> 
        <motion.div 
          animate={{ 
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%"
          }}
          className="flex items-center"
        >
          <img
            src="/stacksdata-logo.png" // Updated logo path
            alt="StacksData"
            className={cn(
              "h-24 w-auto transition-all duration-300", // Set height to h-24 (3x original)
              collapsed ? "scale-90" : "scale-100"
            )}
          />
          {/* Removed the StacksData text label */}
        </motion.div>
      </div>

      {/* Reduced spacing */}
      <div className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin"> 
        <SidebarLink
          to="/dashboard"
          icon={<LayoutDashboard />} // Size handled in span now
          label="Dashboard"
          collapsed={collapsed}
        />

        <div className="border-b border-sidebar-border/50 my-2"></div> {/* Divider */}
        
        <SidebarNavGroup 
          title="Companies" 
          icon={<Building />} // Size handled in span now
          collapsed={collapsed}
        >
          <SidebarLink
            to="/suppliers"
            icon={<Users />} // Size handled in span now
            label="Our Suppliers"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/customers"
            icon={<Users />} // Size handled in span now
            label="Our Customers"
            collapsed={collapsed}
          />
        </SidebarNavGroup>

        <div className="border-b border-sidebar-border/50 my-2"></div> {/* Divider */}
        
        <SidebarNavGroup
          title="Product Sheets"
          icon={<FileText />} // Size handled in span now
          collapsed={collapsed}
        >
          <SidebarLink
            to="/supplier-products"
            icon={<FileText />} // Size handled in span now
            label="Suppliers' Products"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/our-products"
            icon={<FileText />} // Size handled in span now
            label="Our Products"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/incoming-pirs"
            icon={<FileText />} // Or a different icon if desired
            label="Incoming Requests"
            collapsed={collapsed}
          />
        </SidebarNavGroup>

        <div className="border-b border-sidebar-border/50 my-2"></div> {/* Divider */}
        
        <SidebarLink
          to="/question-bank"
          icon={<HelpCircle />} // Size handled in span now
          label="Question Bank"
          collapsed={collapsed}
        />

        <div className="border-b border-sidebar-border/50 my-2"></div> {/* Divider */}
        
        <SidebarLink
          to="/tags"
          icon={<Tag />} // Size handled in span now
          label="Tags"
          collapsed={collapsed}
        />
      </div>

      {/* Adjusted padding */}
      <div className="mt-auto px-3 pb-2"> 
        <Button
          variant="ghost"
          size="icon" // Keep size icon for consistency
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full h-10 flex justify-center items-center transition-all duration-200",
            "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
          )}
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>

      {/* Replace user display with UserSwitcher */}
      <div className="px-3 py-3 mt-2 border-t border-border"> 
        <UserSwitcher />
      </div>
    </motion.div>
  );
};

export default Sidebar;
