import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";

const CompanySelector = () => {
  const { userCompanies, currentCompany, setCurrentCompany } = useAuth();

  // Automatically set the current company if there's only one
  useEffect(() => {
    if (userCompanies.length === 1 && !currentCompany) {
      setCurrentCompany(userCompanies[0]);
    }
  }, [userCompanies, currentCompany, setCurrentCompany]);

  // If user has only one company, don't show the selector
  if (userCompanies.length <= 1) {
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