
import React from "react";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { toast } from "sonner";
import ProductSearchBar from "@/components/productSheets/ProductSearchBar";
import ProductsTable from "@/components/productSheets/ProductsTable";
import RequestUpdateModal from "@/components/productSheets/RequestUpdateModal";
import { useProductSheets } from "@/hooks/useProductSheets";

const SupplierProducts = () => {
  const {
    searchTerm,
    setSearchTerm,
    filteredSheets,
    isUpdateModalOpen,
    setIsUpdateModalOpen,
    selectedSheet,
    getCompanyName,
    handleRowClick,
    handleAction,
    getCompletionRate,
    getSheetTags,
    handleUpdateRequest,
  } = useProductSheets();

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

      <ProductSearchBar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <ProductsTable
        productSheets={filteredSheets}
        getCompanyName={getCompanyName}
        getCompletionRate={getCompletionRate}
        getSheetTags={getSheetTags}
        onRowClick={handleRowClick}
        onAction={handleAction}
      />

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
