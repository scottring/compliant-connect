
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
import { UserCircle, UserPlus } from "lucide-react";
import { mockUsers } from "@/data/mockData";
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
      companyId: null,
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
    
    const newCompanyId = `c${Date.now()}`;
    
    addCompany({
      name: companyName,
      contactName: "Test Contact",
      contactEmail: "contact@example.com",
      role: role,
      phone: "555-123-4567",
      address: "123 Test St",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      country: "Testland",
    });
    
    // Create and switch to a new user for this company
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      email: `${role}@example.com`,
      role: "user",
      companyId: newCompanyId,
    };
    
    setUser(newUser);
    toast.success(`Created ${role} company and user`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCircle className="h-4 w-4" />
          {user?.name || "Not signed in"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Test Users</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {mockUsers.length > 0 ? (
          mockUsers.map((mockUser) => (
            <DropdownMenuItem
              key={mockUser.id}
              onClick={() => setUser(mockUser)}
              className={mockUser.id === user?.id ? "bg-accent" : ""}
            >
              {mockUser.name} ({mockUser.companyId && mockUser.companyId.slice(0, 4)})
            </DropdownMenuItem>
          ))
        ) : (
          <>
            <DropdownMenuItem onClick={handleCreateTestUser} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create Admin User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateCompanyAndUser("customer")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create Customer Company + User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateCompanyAndUser("supplier")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create Supplier Company + User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateCompanyAndUser("both")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create Hybrid Company + User
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserSwitcher;
