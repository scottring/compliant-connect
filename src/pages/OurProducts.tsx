
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, Plus, PackageOpen, Users } from "lucide-react";
import { toast } from "sonner";
import { ProductSheet } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

const OurProducts = () => {
  const { productSheets, companies, user } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("our-products");
  const navigate = useNavigate();

  // Filter product sheets to only include ones where our company is the supplier
  const ourProducts = productSheets.filter((sheet) => {
    const supplierCompany = companies.find(
      (company) => company.id === sheet.supplierId
    );
    // If the current user's company is the supplier of this product
    return user && supplierCompany && supplierCompany.id === user.companyId;
  });

  // Filter product sheets to find customer PIRs for our products
  // These are sheets where our company is the supplier and there's a requestedById
  const customerRequests = productSheets.filter((sheet) => {
    // Check if the current user's company is the supplier AND there's a customer requesting it
    return user && sheet.supplierId === user.companyId && sheet.requestedById;
  });

  // Filter based on search term and active tab
  const getFilteredProducts = () => {
    const productsToFilter = 
      activeTab === "our-products" ? ourProducts : 
      activeTab === "customer-requests" ? customerRequests : 
      [...ourProducts, ...customerRequests];

    return productsToFilter.filter(
      (sheet) =>
        sheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredProducts = getFilteredProducts();

  const handleAddProduct = () => {
    toast.info("Adding new product...");
    // This would open a modal to add a new product in a real implementation
  };

  const handleProductAction = (product: ProductSheet) => {
    if (activeTab === "customer-requests") {
      navigate(`/customer-review/${product.id}`);
    } else {
      toast.info(`Viewing product ${product.name}`);
      // This would navigate to a product detail page in a real implementation
    }
  };

  // Get the number of customer requests for a product
  const getCustomerRequestCount = (productId: string) => {
    return customerRequests.filter(request => 
      request.name.includes(productId) || 
      request.description?.includes(productId)
    ).length;
  };

  // Function to get company name by ID
  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : "Unknown";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Products"
        description="Manage the products your company manufactures or sells"
        actions={
          <PageHeaderAction
            label="Add Product"
            onClick={handleAddProduct}
            icon={<Plus className="h-4 w-4" />}
          />
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({ourProducts.length + customerRequests.length})
          </TabsTrigger>
          <TabsTrigger value="our-products">
            Our Products ({ourProducts.length})
          </TabsTrigger>
          <TabsTrigger value="customer-requests">
            Customer PIRs ({customerRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-md">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button variant="outline" className="ml-2 gap-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  {activeTab === "customer-requests" && (
                    <TableHead>Requested By</TableHead>
                  )}
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {activeTab !== "customer-requests" && (
                    <TableHead>Customer Requests</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      className="transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleProductAction(product)}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      {activeTab === "customer-requests" && (
                        <TableCell>
                          {getCompanyName(product.requestedById || "")}
                        </TableCell>
                      )}
                      <TableCell>{product.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              product.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : product.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : product.status === "reviewing"
                                ? "bg-yellow-100 text-yellow-800"
                                : product.status === "submitted"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                          </span>
                        </div>
                      </TableCell>
                      {activeTab !== "customer-requests" && (
                        <TableCell>
                          {getCustomerRequestCount(product.id) > 0 ? (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {getCustomerRequestCount(product.id)}
                            </span>
                          ) : "0"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductAction(product);
                          }}
                          variant="secondary"
                          size="sm"
                          className="bg-brand hover:bg-brand-700 text-white"
                        >
                          {activeTab === "customer-requests" ? "Review" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={activeTab === "customer-requests" ? 5 : 5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageOpen className="h-10 w-10 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium">No products found</h3>
                        <p className="text-sm text-muted-foreground">
                          {activeTab === "our-products" && ourProducts.length === 0
                            ? "Add your first product to get started."
                            : activeTab === "customer-requests" && customerRequests.length === 0
                            ? "No customer PIRs for your products yet."
                            : "No products match your search criteria."}
                        </p>
                        {activeTab === "our-products" && ourProducts.length === 0 && (
                          <Button
                            onClick={handleAddProduct}
                            className="mt-2"
                            variant="outline"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OurProducts;
