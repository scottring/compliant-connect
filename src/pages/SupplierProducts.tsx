
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Search, Filter, Eye, ClipboardCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SupplierProducts = () => {
  const { productSheets, companies, user } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  
  // Filter product sheets based on user role
  const filteredSheets = productSheets.filter((sheet) => {
    // Always show all sheets for demo purposes
    const matchesSearch = 
      (sheet.name && sheet.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sheet.supplierId && getCompanyName(sheet.supplierId).toLowerCase().includes(searchTerm.toLowerCase()));
    
    // In a real app with auth, we'd filter by user's company role
    return matchesSearch;
  });

  // Find company name by ID
  const getCompanyName = (supplierId: string) => {
    const company = companies.find(c => c.id === supplierId);
    return company ? company.name : "Unknown";
  };

  const handleAction = (sheetId: string, action: string) => {
    if (action === "edit") {
      navigate(`/supplier-response-form/${sheetId}`);
    } else if (action === "review") {
      navigate(`/customer-review/${sheetId}`);
    }
  };

  // Calculate a completion rate if one doesn't exist
  const getCompletionRate = (sheet: any) => {
    if (sheet.completionRate !== undefined) return sheet.completionRate;
    
    // Calculate from the progress property if available
    const company = companies.find(c => c.id === sheet.supplierId);
    return company ? company.progress : 0;
  };

  // Determine if the current user can edit or review based on user role
  // In a real app, this would check user permissions more thoroughly
  const canEdit = true; // For demo purposes
  const canReview = true; // For demo purposes

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Sheets (All Suppliers)"
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting data...")}
            />
            <PageHeaderAction
              label="Request New Sheet"
              onClick={() => toast.info("Creating new sheet request...")}
            />
          </>
        }
      />

      {user && (
        <div className="bg-muted p-4 rounded-md mb-4">
          <p className="text-sm">You are currently signed in as: <strong>{user.name}</strong> ({user.email})</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use the user switcher in the top-right corner to test different user roles
          </p>
        </div>
      )}

      <div className="flex justify-between items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or supplier"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Task Progress</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSheets.map((sheet) => (
              <TableRow key={sheet.id}>
                <TableCell className="font-medium">{sheet.name}</TableCell>
                <TableCell>{getCompanyName(sheet.supplierId)}</TableCell>
                <TableCell>
                  <Progress value={getCompletionRate(sheet)} className="h-2 w-[100px]" />
                </TableCell>
                <TableCell>
                  {sheet.updatedAt 
                    ? format(new Date(sheet.updatedAt), "yyyy-MM-dd") 
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                      >
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => handleAction(sheet.id, "edit")}>
                          <Eye className="h-4 w-4 mr-2" />
                          View & Edit
                        </DropdownMenuItem>
                      )}
                      {canReview && (
                        <DropdownMenuItem onClick={() => handleAction(sheet.id, "review")}>
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Review
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredSheets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No product sheets found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SupplierProducts;
