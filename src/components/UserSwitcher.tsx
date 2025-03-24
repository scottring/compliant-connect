
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

const mockUsers: User[] = [
  {
    id: "user1",
    name: "Customer Admin",
    email: "customer@example.com",
    role: "admin",
  },
  {
    id: "user2",
    name: "Supplier Admin",
    email: "supplier@example.com",
    role: "admin",
  },
  {
    id: "user3",
    name: "Both Customer/Supplier",
    email: "both@example.com",
    role: "admin",
  },
];

const UserSwitcher = () => {
  const { user, setUser } = useApp();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCircle className="h-4 w-4" />
          {user?.name || "Switch User"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Test Different Users</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mockUsers.map((mockUser) => (
          <DropdownMenuItem
            key={mockUser.id}
            onClick={() => setUser(mockUser)}
            className={mockUser.id === user?.id ? "bg-accent" : ""}
          >
            {mockUser.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserSwitcher;
