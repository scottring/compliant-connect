
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
      id: newCompanyId,
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
      progress: 0,
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

  // Get all available users (created + mock)
  const availableUsers = [...mockUsers];

  // Add current user if not in mockUsers
  if (user && !availableUsers.some(u => u.id === user.id)) {
    availableUsers.push(user);
  }

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
        
        {availableUsers.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pt-2">
              Available Users
            </DropdownMenuLabel>
            {availableUsers.map((availableUser) => {
              const userCompany = companies.find(c => c.id === availableUser.companyId);
              return (
                <DropdownMenuItem
                  key={availableUser.id}
                  onClick={() => {
                    setUser(availableUser);
                    toast.success(`Switched to ${availableUser.name}`);
                  }}
                  className={`${availableUser.id === user?.id ? "bg-accent" : ""} justify-between`}
                >
                  <div className="flex flex-col">
                    <span>{availableUser.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {availableUser.role === "admin" 
                        ? "Admin" 
                        : userCompany 
                          ? `${userCompany.name} (${userCompany.role})` 
                          : "No company"}
                    </span>
                  </div>
                  {availableUser.id === user?.id && (
                    <span className="text-xs bg-primary/20 text-primary rounded px-1.5 py-0.5">
                      Current
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
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
