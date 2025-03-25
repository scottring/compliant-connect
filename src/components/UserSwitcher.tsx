
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

const UserSwitcher = () => {
  const { user, setUser } = useApp();

  const handleCreateTestUser = () => {
    toast.info("To create test users, use the 'Add User' functionality in your application");
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
          <DropdownMenuItem onClick={handleCreateTestUser} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Test User
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserSwitcher;
