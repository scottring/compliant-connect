
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

interface ProductSearchBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  searchTerm,
  setSearchTerm,
}) => {
  return (
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
  );
};

export default ProductSearchBar;
