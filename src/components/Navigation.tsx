import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  Building2,
  Tags,
  Settings,
  FileQuestion,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const navigationItems: NavigationItem[] = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: Building2,
  },
  {
    title: "Questions",
    href: "/questions",
    icon: FileQuestion,
    permission: "admin:access",
  },
  {
    title: "Tags",
    href: "/tags",
    icon: Tags,
    permission: "admin:access",
  },
  {
    title: "Product Sheets",
    href: "/product-sheets",
    icon: ClipboardList,
  },
  {
    title: "Admin Settings",
    href: "/admin/settings",
    icon: Settings,
    permission: "admin:access",
  },
];

export function Navigation() {
  const location = useLocation();
  const { hasPermission } = useAuth();

  return (
    <nav className="grid items-start gap-2">
      {navigationItems.map((item) => {
        // Skip items that require permissions the user doesn't have
        if (item.permission && !hasPermission(item.permission)) {
          return null;
        }

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              location.pathname === item.href && "bg-accent"
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
} 