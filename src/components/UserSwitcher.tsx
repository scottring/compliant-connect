
import React from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types";

const UserSwitcher = () => {
  const { user, setUser, companies, addCompany } = useApp();

  const handleCreateTestUser = () => {
    // Example of creating a test admin user
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
    };
    setUser(newUser);
    toast.success("Created and switched to admin user");
  };

  const handleCreateCompanyAndUser = (role: "customer" | "supplier" | "both") => {
    // Create a test company first
    const companyName = role === "customer" 
      ? "Test Customer Inc." 
      : role === "supplier" 
        ? "Test Supplier Ltd." 
        : "Test Hybrid Corp.";
    
    addCompany({
      name: companyName,
      contactName: "Test Contact",
      contactEmail: "contact@example.com",
      role: role,
      contactPhone: "555-123-4567",
      address: "123 Test St",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      country: "Testland",
    });
    
    // Wait a moment for the company to be added before creating the user
    setTimeout(() => {
      // Find the newly created company
      const newCompany = companies.find(c => c.name === companyName);
      
      if (newCompany) {
        // Create and switch to a new user for this company
        const newUser: User = {
          id: `user-${Date.now()}`,
          name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
          email: `${role}@example.com`,
          role: "user",
          companyId: newCompany.id,
        };
        
        setUser(newUser);
        toast.success(`Created ${role} company and user`);
      } else {
        toast.error("Failed to create company. Please try again.");
      }
    }, 100);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCircle className="h-4 w-4" />
          {user?.name || "Not signed in"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>User Selection</DropdownMenuLabel>
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pt-2">
          Create Test Users
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCreateTestUser} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Admin User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCreateCompanyAndUser("customer")} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Customer User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCreateCompanyAndUser("supplier")} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Supplier User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCreateCompanyAndUser("both")} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Hybrid User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserSwitcher;
