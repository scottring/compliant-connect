import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // Keep for user check?
import { useCompanyData } from "@/hooks/use-company-data"; // Use for company context
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client"; // Ensure correct client
import { Tables } from "@/integrations/supabase/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Settings, Users, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';

// Interface for the combined user data fetched
interface UserWithDetails {
  user_id: string;
  company_id: string;
  role: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  // company_role: string | null; // company.role was removed from Company type
}

// --- Reusable Update User Role Mutation Hook ---
const useUpdateUserRoleMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<unknown, Error, { userId: string; companyId: string; newRole: string }> => {
    return useMutation<unknown, Error, { userId: string; companyId: string; newRole: string }>({
        mutationFn: async ({ userId, companyId, newRole }) => {
            const { error } = await supabase
                .from("company_users")
                .update({ role: newRole })
                .match({ user_id: userId, company_id: companyId });
            if (error) throw new Error(`Failed to update role: ${error.message}`);
            return null; // Or return updated data if needed
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allUsersWithDetails'] }); // Invalidate the users query
            toast.success("User role updated successfully");
        },
        onError: (error) => {
            toast.error(`Failed to update user role: ${error.message}`);
        },
    });
};
// --- End Update User Role Mutation Hook ---


const AdminSettings = () => {
  const { user: currentUser } = useAuth(); // Keep for potential future permission checks
  const { currentCompany } = useCompanyData(); // Get current company context if needed elsewhere
  const queryClient = useQueryClient();
  // const [users, setUsers] = useState<UserWithDetails[]>([]); // Replaced by useQuery
  // const [loading, setLoading] = useState(true); // Replaced by useQuery
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all users with their profile and company details
  const fetchAllUsersWithDetails = async (): Promise<UserWithDetails[]> => {
      const { data, error } = await supabase
        .from("company_users")
        .select(`
          user_id,
          company_id,
          role,
          user:user_id (
            email,
            profile:profiles (
              first_name,
              last_name
            )
          ),
          company:companies (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading users:", error);
        throw new Error(`Failed to load users: ${error.message}`);
      }

      // Transform the data
      const transformedData = (data || []).map((item: any) => ({
        user_id: item.user_id,
        company_id: item.company_id,
        role: item.role,
        email: item.user?.email ?? 'N/A',
        first_name: item.user?.profile?.first_name ?? '',
        last_name: item.user?.profile?.last_name ?? '',
        company_name: item.company?.name ?? 'N/A',
      }));

      return transformedData;
  };

  const {
      data: users,
      isLoading: loadingUsers, // Use query loading state
      error: errorUsers, // Use query error state
      refetch: refetchUsers,
  } = useQuery<UserWithDetails[], Error>({
      queryKey: ['allUsersWithDetails'],
      queryFn: fetchAllUsersWithDetails,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      // Removed onError - handle via errorUsers state
  });

  // Update User Role Mutation
  const updateUserRoleMutation = useUpdateUserRoleMutation(queryClient);

  const handleUpdateUserRole = (userId: string, companyId: string, newRole: string) => {
      updateUserRoleMutation.mutate({ userId, companyId, newRole });
  };


  const filteredUsers = (users ?? []).filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
      (user.company_name && user.company_name.toLowerCase().includes(searchLower))
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
                    {loadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : errorUsers ? (
                       <TableRow>
                        <TableCell colSpan={4} className="text-center text-red-500">
                          Error loading users: {errorUsers.message}
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No users found {searchTerm && 'matching search'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={`${user.user_id}-${user.company_id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.company_name}</div>
                              {/* <Badge variant="secondary">
                                {user.company_role} // Removed
                              </Badge> */}
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
                                handleUpdateUserRole(user.user_id, user.company_id, newRole)
                              }
                              // Disable select while mutation is pending for this specific user? (More complex state needed)
                              // disabled={updateUserRoleMutation.isPending}
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
          {/* Permissions content remains the same */}
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