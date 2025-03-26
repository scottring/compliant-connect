import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Settings, Users, Shield } from "lucide-react";

interface UserWithProfile {
  user_id: string;
  company_id: string;
  role: string;
  user: {
    email: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
  company: {
    name: string;
    role: string;
  };
}

const AdminSettings = () => {
  const { user: currentUser, currentCompany } = useAuth();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadUsers();
  }, [currentCompany]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("company_users")
        .select(`
          *,
          user:user_id (
            email,
            profile:profiles (
              first_name,
              last_name
            )
          ),
          company:companies (*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to match our UserWithProfile interface
      const transformedData = data.map((item: any) => ({
        user_id: item.user_id,
        company_id: item.company_id,
        role: item.role,
        user: {
          email: item.user.email,
          profile: {
            first_name: item.user.profile.first_name,
            last_name: item.user.profile.last_name,
          },
        },
        company: {
          name: item.company.name,
          role: item.company.role,
        },
      }));

      setUsers(transformedData);
    } catch (error: any) {
      toast.error("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, companyId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("company_users")
        .update({ role: newRole })
        .match({ user_id: userId, company_id: companyId });

      if (error) throw error;

      toast.success("User role updated successfully");
      loadUsers(); // Reload the users list
    } catch (error: any) {
      toast.error("Failed to update user role: " + error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.user.email.toLowerCase().includes(searchLower) ||
      user.user.profile.first_name.toLowerCase().includes(searchLower) ||
      user.user.profile.last_name.toLowerCase().includes(searchLower) ||
      user.company.name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Settings"
        description="Manage user roles and system settings"
        actions={<Settings className="h-6 w-6" />}
      />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions across the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={`${user.user_id}-${user.company_id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.user.profile.first_name} {user.user.profile.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.company.name}</div>
                              <Badge variant="secondary">
                                {user.company.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.role === "owner" ? "default" : "outline"}
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(newRole) =>
                                updateUserRole(user.user_id, user.company_id, newRole)
                              }
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Settings</CardTitle>
              <CardDescription>
                Configure system-wide permission settings and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Admin Access</h4>
                      <p className="text-sm text-muted-foreground">
                        Users with admin role can access admin features
                      </p>
                    </div>
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Question Bank</h4>
                      <p className="text-sm text-muted-foreground">
                        Access to create and manage compliance questions
                      </p>
                    </div>
                    <Badge variant="secondary">Admin Only</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Tags Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Ability to create and manage compliance tags
                      </p>
                    </div>
                    <Badge variant="secondary">Admin Only</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings; 