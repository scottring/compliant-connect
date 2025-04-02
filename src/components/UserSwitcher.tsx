
import React from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, UserPlus, Users, LogOut } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types";

const UserSwitcher = () => {
  const { user: appUser, setUser } = useApp(); // Removed companies, addCompany
  const { user: authUser, signOut } = useAuth();

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

  // Removed handleCreateCompanyAndUser function as it relied on removed AppContext state

  const handleSignOut = async () => {
    await signOut();
  };

  // Display real authenticated user if available, otherwise use the mock user from AppContext
  const displayUser = authUser || appUser;
  const displayName = authUser ? 
    (authUser.user_metadata?.first_name && authUser.user_metadata?.last_name ? 
      `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}` : 
      authUser.email) : 
    appUser?.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCircle className="h-4 w-4" />
          {displayName || "Not signed in"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>User Selection</DropdownMenuLabel>
        
        {authUser && (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pt-2">
              Authenticated as {authUser.email}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-red-600">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pt-2">
          Create Test Users
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCreateTestUser} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Admin User
        </DropdownMenuItem>
        {/* Removed menu items for creating company+user */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserSwitcher;
