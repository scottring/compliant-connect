
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";
import { mockTags } from "@/data/mockData";
import { Tag } from "@/types";

export const useProductSheets = () => {
  const { productSheets, companies } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const navigate = useNavigate();
  
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
  const getSheetTags = (sheet: any): Tag[] => {
    if (!sheet.tags || !Array.isArray(sheet.tags)) return [];
    
    return sheet.tags.map((tagId: string) => {
      // Find the tag from mockTags
      const tag = mockTags.find(t => t.id === tagId);
      // Return the found tag or create a fallback tag object
      return tag || { 
        id: tagId, 
        name: tagId, 
        color: "#888888" 
      };
    });
  };

  const handleUpdateRequest = (sheet: any, additionalTags: string[], comments?: string) => {
    toast.success(`Update request sent to ${getCompanyName(sheet.supplierId)}`);
    // In a real app, this would send an email to the supplier
    setIsUpdateModalOpen(false);
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredSheets,
    isUpdateModalOpen,
    setIsUpdateModalOpen,
    selectedSheet,
    setSelectedSheet,
    getCompanyName,
    handleRowClick,
    handleAction,
    getCompletionRate,
    getSheetTags,
    handleUpdateRequest,
  };
};
