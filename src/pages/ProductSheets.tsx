import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Eye, Calendar, Tag, ArrowUpDown } from "lucide-react";
import TaskProgress from "@/components/ui/progress/TaskProgress";

const ProductSheets = () => {
  const { productSheets, companies, tags } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : "Unknown";
  };

  const getTagNames = (tagIds: string[]) => {
    return tagIds.map(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag ? tag.name : "";
    }).filter(Boolean).join(", ");
  };

  const filteredProductSheets = productSheets.filter((sheet) =>
    sheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCompanyName(sheet.supplierId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const drafts = filteredProductSheets.filter((sheet) => sheet.status === "draft");
  const submitted = filteredProductSheets.filter((sheet) => sheet.status === "submitted");
  const reviewing = filteredProductSheets.filter((sheet) => sheet.status === "reviewing");
  const approved = filteredProductSheets.filter((sheet) => sheet.status === "approved");
  const rejected = filteredProductSheets.filter((sheet) => sheet.status === "rejected");

  const handleProductSheetClick = (productSheetId: string) => {
    navigate(`/supplier-response-form/${productSheetId}`);
  };

  const renderProductSheetTable = (sheets: typeof productSheets) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>
              <div className="flex items-center">
                Completion
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheets.length > 0 ? (
            sheets.map((sheet) => {
              // Calculate completion based on answers
              const totalAnswers = sheet.answers ? sheet.answers.length : 0;
              const totalQuestions = sheet.questions.length;
              const completionRate = totalQuestions > 0 
                ? Math.round((totalAnswers / totalQuestions) * 100) 
                : Math.round(Math.random() * 100); // Fallback for demo purposes
                
              return (
                <TableRow 
                  key={sheet.id} 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleProductSheetClick(sheet.id)}
                >
                  <TableCell className="font-medium">{sheet.name}</TableCell>
                  <TableCell>{getCompanyName(sheet.supplierId)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={getTagNames(sheet.tags)}>
                    {getTagNames(sheet.tags) || "—"}
                  </TableCell>
                  <TableCell>
                    <TaskProgress value={completionRate} size="sm" showLabel />
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                      sheet.status === "approved" ? "bg-green-100 text-green-800" :
                      sheet.status === "rejected" ? "bg-red-100 text-red-800" :
                      sheet.status === "reviewing" ? "bg-blue-100 text-blue-800" :
                      sheet.status === "submitted" ? "bg-amber-100 text-amber-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {sheet.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : 
                     new Date(sheet.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductSheetClick(sheet.id);
                      }}
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No product sheets found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Sheets"
        description="Manage and track compliance information for your products"
        actions={
          <PageHeaderAction
            label="New Product Sheet"
            onClick={() => toast.info("Creating new product sheet...")}
            icon={
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          />
        }
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search product sheets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-5 w-5 mr-2" />
          Filter
        </Button>
        <Button variant="outline">
          <Tag className="h-5 w-5 mr-2" />
          View Info Categories
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({filteredProductSheets.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({drafts.length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing ({reviewing.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {renderProductSheetTable(filteredProductSheets)}
        </TabsContent>
        
        <TabsContent value="draft" className="mt-6">
          {renderProductSheetTable(drafts)}
        </TabsContent>
        
        <TabsContent value="submitted" className="mt-6">
          {renderProductSheetTable(submitted)}
        </TabsContent>
        
        <TabsContent value="reviewing" className="mt-6">
          {renderProductSheetTable(reviewing)}
        </TabsContent>
        
        <TabsContent value="approved" className="mt-6">
          {renderProductSheetTable(approved)}
        </TabsContent>
        
        <TabsContent value="rejected" className="mt-6">
          {renderProductSheetTable(rejected)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductSheets;
