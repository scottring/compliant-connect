
import React from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle } from "lucide-react";
import { mockUsers } from "@/data/mockData";

const UserSwitcher = () => {
  const { user, setUser } = useApp();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCircle className="h-4 w-4" />
          {user?.name || "Admin User"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Test Users</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mockUsers.map((mockUser) => (
          <DropdownMenuItem
            key={mockUser.id}
            onClick={() => setUser(mockUser)}
            className={mockUser.id === user?.id ? "bg-accent" : ""}
          >
            {mockUser.name} ({mockUser.companyId && mockUser.companyId.slice(0, 4)})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserSwitcher;
