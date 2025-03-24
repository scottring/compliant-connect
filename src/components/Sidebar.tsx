
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const Sidebar: React.FC = () => {
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
              src="/lovable-uploads/f586003e-96bf-4fc9-a319-a23ea3f422f8.png"
              alt="StacksData"
              className="h-8 w-auto mr-2"
            />
            <span className="text-lg font-semibold text-brand-600">StacksData</span>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <img
              src="/lovable-uploads/f586003e-96bf-4fc9-a319-a23ea3f422f8.png"
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
          to="/product-sheets"
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
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          }
          label="Product Sheets"
          collapsed={collapsed}
        />
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
