
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import TagBadge from "@/components/tags/TagBadge";
import { mockTags } from "@/data/mockData";
import RequestUpdateModal from "@/components/productSheets/RequestUpdateModal";

const SupplierProducts = () => {
  const { productSheets, companies } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  
  // Filter product sheets to only show supplier products
  const filteredSheets = productSheets.filter((sheet) => {
    // Check if sheet.name exists before calling toLowerCase()
    const matchesSearch = 
      (sheet.name && sheet.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sheet.supplierId && sheet.supplierId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  // Find company name by ID
  const getCompanyName = (supplierId: string) => {
    const company = companies.find(c => c.id === supplierId);
    return company ? company.name : "Unknown";
  };

  const handleRowClick = (sheet: any) => {
    navigate(`/product-sheets/${sheet.id}`);
  };

  const handleAction = (e: React.MouseEvent, sheet: any, action: string) => {
    e.stopPropagation(); // Prevent row click event
    
    if (action === "view") {
      navigate(`/product-sheets/${sheet.id}`);
    } else if (action === "request-update") {
      setSelectedSheet(sheet);
      setIsUpdateModalOpen(true);
    }
  };

  // Calculate a completion rate if one doesn't exist
  const getCompletionRate = (sheet: any) => {
    if (sheet.completionRate !== undefined) return sheet.completionRate;
    
    // Calculate from the progress property if available
    const company = companies.find(c => c.id === sheet.supplierId);
    return company ? company.progress : 0;
  };

  // Get tags for a product sheet
  const getSheetTags = (sheet: any) => {
    if (!sheet.tags || !Array.isArray(sheet.tags)) return [];
    
    return sheet.tags.map((tagId: string) => {
      // For demo purposes, we'll use the mockTags
      // In a real app, this would fetch from the actual tags in the sheet
      return mockTags.find(t => t.id === tagId) || { id: tagId, name: tagId, color: "#888888" };
    });
  };

  const handleUpdateRequest = (sheet: any, additionalTags: string[]) => {
    toast.success(`Update request sent to ${getCompanyName(sheet.supplierId)}`);
    // In a real app, this would send an email to the supplier
    setIsUpdateModalOpen(false);
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
              <TableHead>Tags</TableHead>
              <TableHead>Task Progress</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSheets.map((sheet) => (
              <TableRow 
                key={sheet.id} 
                className="cursor-pointer hover:bg-muted/60"
                onClick={() => handleRowClick(sheet)}
              >
                <TableCell className="font-medium">{sheet.name}</TableCell>
                <TableCell>{getCompanyName(sheet.supplierId)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getSheetTags(sheet).map((tag: any) => (
                      <TagBadge key={tag.id} tag={tag} size="sm" />
                    ))}
                    {(!sheet.tags || sheet.tags.length === 0) && (
                      <span className="text-muted-foreground text-xs">No tags</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Progress value={getCompletionRate(sheet)} className="h-2 w-[100px]" />
                </TableCell>
                <TableCell>
                  {sheet.updatedAt 
                    ? format(new Date(sheet.updatedAt), "yyyy-MM-dd") 
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      onClick={(e) => handleAction(e, sheet, "view")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                    >
                      View
                    </Button>
                    <Button 
                      onClick={(e) => handleAction(e, sheet, "request-update")}
                      variant="outline"
                      size="sm"
                    >
                      Request Update
                    </Button>
                  </div>
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

      {selectedSheet && (
        <RequestUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          sheet={selectedSheet}
          supplierName={getCompanyName(selectedSheet.supplierId)}
          onSubmit={handleUpdateRequest}
        />
      )}
    </div>
  );
};

export default SupplierProducts;
