
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { Search, Filter } from "lucide-react";

const SupplierProducts = () => {
  const { productSheets, companies } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter product sheets to only show supplier products
  const filteredSheets = productSheets.filter((sheet) => {
    const matchesSearch = 
      sheet.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.companyId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Find company name by ID
  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : "Unknown";
  };

  const handleAction = (sheetId: string) => {
    toast.info(`Opening product sheet ${sheetId}`);
    // In a real app, this would navigate to the product sheet detail page
  };

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

      <div className="flex justify-between items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type Something"
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
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSheets.map((sheet) => (
              <TableRow key={sheet.id}>
                <TableCell className="font-medium">{sheet.productName}</TableCell>
                <TableCell>{getCompanyName(sheet.companyId)}</TableCell>
                <TableCell>
                  <Progress value={sheet.completionRate || 0} className="h-2 w-[100px]" />
                </TableCell>
                <TableCell>
                  {sheet.updatedAt 
                    ? format(new Date(sheet.updatedAt), "yyyy-MM-dd") 
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {sheet.updatedAt 
                    ? format(new Date(sheet.updatedAt), "yyyy-MM-dd") 
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Button 
                    onClick={() => handleAction(sheet.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    Action
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredSheets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
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
