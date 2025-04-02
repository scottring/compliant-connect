import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center px-3 py-2 my-1 rounded-md transition-all duration-200",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground",
          collapsed ? "justify-center" : "justify-start"
        )
      }
    >
      <span className="flex items-center justify-center w-8 h-8">{icon}</span>
      {!collapsed && <span className="ml-2 font-medium">{label}</span>}
    </NavLink>
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
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center">
          <span className="flex items-center justify-center w-8 h-8">{icon}</span>
          {!collapsed && <span className="ml-2 font-medium">{title}</span>}
        </div>
        {!collapsed && (
          <span className="text-sidebar-foreground">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        )}
      </button>
      
      {isOpen && !collapsed && <div className="pl-4 mt-1">{children}</div>}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const { user } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "h-screen flex flex-col bg-sidebar py-4 transition-all duration-300 border-r border-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="px-4 flex items-center mb-6">
        {!collapsed && (
          <div className="flex items-center">
            <img
              src="/lovable-uploads/c2472b5a-b16b-4f53-9ea4-eb27391a2e5b.png"
              alt="StacksData"
              className="h-8 w-auto"
            />
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <img
              src="/lovable-uploads/c2472b5a-b16b-4f53-9ea4-eb27391a2e5b.png"
              alt="Logo"
              className="h-8 w-auto"
            />
          </div>
        )}
      </div>

      <div className="flex-1 px-2 space-y-1">
        <SidebarLink
          to="/dashboard"
          icon={
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          }
          label="Dashboard"
          collapsed={collapsed}
        />
        
        <SidebarNavGroup 
          title="Companies" 
          icon={
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          collapsed={collapsed}
        >
          <SidebarLink
            to="/suppliers"
            icon={
              <svg
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Our Suppliers"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/customers"
            icon={
              <svg
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Our Customers"
            collapsed={collapsed}
          />
        </SidebarNavGroup>
        
        <SidebarNavGroup
          title="Product Sheets"
          icon={
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
          collapsed={collapsed}
        >
          <SidebarLink
            to="/supplier-products"
            icon={
              <svg
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            }
            label="Suppliers' Products"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/our-products"
            icon={
              <svg
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            }
            label="Our Products"
            collapsed={collapsed}
          />
        </SidebarNavGroup>
        
        <SidebarLink
          to="/question-bank"
          icon={
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          }
          label="Question Bank"
          collapsed={collapsed}
        />
        
        <SidebarLink
          to="/tags"
          icon={
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
              <path d="M7 7h.01" />
            </svg>
          }
          label="Tags"
          collapsed={collapsed}
        />
      </div>

      <div className="mt-auto px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-10 flex justify-center items-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="px-4 py-3 mt-2 border-t border-border">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-3")}>
          {!collapsed && user && (
            <>
              <img
                src={user.avatar || "https://ui-avatars.com/api/?name=" + user.name}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[150px]">{user.name}</span>
                <span className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</span>
              </div>
            </>
          )}
          {collapsed && user && (
            <img
              src={user.avatar || "https://ui-avatars.com/api/?name=" + user.name}
              alt={user.name}
              className="h-8 w-8 rounded-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
