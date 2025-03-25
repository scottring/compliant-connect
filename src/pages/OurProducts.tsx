
import React, { useState, useEffect } from "react";
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
  
  useEffect(() => {
    console.log("Current user:", user);
    if (!user?.companyId) {
      toast.error("Please select a user with a company to view products");
    }
  }, [user]);

  const ourProducts = productSheets.filter((sheet) => {
    return user?.companyId && sheet.supplierId === user.companyId;
  });

  const customerRequests = productSheets.filter((sheet) => {
    console.log("Checking sheet:", sheet.name, "supplierId:", sheet.supplierId, "requestedById:", sheet.requestedById, "user companyId:", user?.companyId);
    return user?.companyId && sheet.supplierId === user.companyId && sheet.requestedById && sheet.requestedById !== user.companyId;
  });

  console.log("Total productSheets:", productSheets.length);
  console.log("User company ID:", user?.companyId);
  console.log("Our Products count:", ourProducts.length);
  console.log("Customer Requests count:", customerRequests.length);
  console.log("Customer Requests:", customerRequests);

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
  };

  const handleProductAction = (product: ProductSheet) => {
    if (activeTab === "customer-requests") {
      navigate(`/supplier-response-form/${product.id}`);
    } else {
      navigate(`/product-sheets/${product.id}`);
    }
  };

  const getCustomerRequestCount = (productId: string) => {
    return customerRequests.filter(request => 
      request.name.includes(productId) || 
      request.description?.includes(productId)
    ).length;
  };

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

      {!user?.companyId ? (
        <div className="rounded-md border p-4 my-4 bg-yellow-50 text-yellow-800">
          <p className="font-medium">No company associated with current user</p>
          <p className="text-sm mt-1">Please select a user with a company to view products</p>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default OurProducts;
