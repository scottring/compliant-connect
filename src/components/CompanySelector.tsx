import React, { useEffect } from "react";
import { useCompanyData } from "@/hooks/use-company-data"; // Import the new hook
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";

const CompanySelector = () => {
  // Use the new hook to get company data and functions
  const { userCompanies, currentCompany, setCurrentCompany, isLoadingCompanies, errorCompanies } = useCompanyData();

  // useEffect for auto-selection is removed as it's handled within useCompanyData

  // If user has only one company, don't show the selector
  // Handle loading and error states
  if (isLoadingCompanies) {
    return <div className="text-sm text-muted-foreground">Loading companies...</div>; // Or a spinner
  }

  if (errorCompanies) {
    return <div className="text-sm text-red-500">Error loading companies</div>;
  }

  // If user has no companies or only one, don't show the selector
  // (The default selection logic is now inside useCompanyData)
  if (!userCompanies || userCompanies.length <= 1) {
    return null;
  }

  const handleCompanyChange = (companyId: string) => {
    const selectedCompany = userCompanies.find(
      (company) => company.id === companyId
    );
    if (selectedCompany) {
      setCurrentCompany(selectedCompany);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Company:</span>
      <Select
        value={currentCompany?.id || ""}
        onValueChange={handleCompanyChange}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {userCompanies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CompanySelector; 