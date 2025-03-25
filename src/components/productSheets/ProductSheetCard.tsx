
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductSheet, Tag } from "@/types";
import TagBadge from "@/components/tags/TagBadge";
import { useApp } from "@/context/AppContext";

interface ProductSheetCardProps {
  productSheet: ProductSheet;
  onClick?: () => void;
}

const ProductSheetCard: React.FC<ProductSheetCardProps> = ({ productSheet, onClick }) => {
  const { companies, tags } = useApp();
  
  const supplier = companies.find(c => c.id === productSheet.supplierId);
  const requestedBy = companies.find(c => c.id === productSheet.requestedById);
  
  const statusColors = {
    draft: { bg: "bg-gray-100", text: "text-gray-800" },
    submitted: { bg: "bg-blue-100", text: "text-blue-800" },
    reviewing: { bg: "bg-amber-100", text: "text-amber-800" },
    approved: { bg: "bg-green-100", text: "text-green-800" },
    rejected: { bg: "bg-red-100", text: "text-red-800" },
  };
  
  const formattedDate = productSheet.updatedAt ? new Date(productSheet.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) : "Not updated";
  
  return (
    <Card 
      className="w-full h-full transition-all duration-200 hover:shadow-md cursor-pointer animate-fade-in"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold truncate">{productSheet.name}</CardTitle>
          <Badge 
            className={`${statusColors[productSheet.status as keyof typeof statusColors]?.bg || statusColors.draft.bg} 
                       ${statusColors[productSheet.status as keyof typeof statusColors]?.text || statusColors.draft.text} 
                       border-none`}
          >
            {productSheet.status.charAt(0).toUpperCase() + productSheet.status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {productSheet.description || "No description provided"}
        </p>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Supplier:</p>
            <p className="font-medium truncate">{supplier?.name || "Unknown"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Requested by:</p>
            <p className="font-medium truncate">{requestedBy?.name || "Unknown"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last updated:</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Questions:</p>
            <p className="font-medium">{productSheet.questions?.length || 0}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <div className="flex flex-wrap gap-1.5">
          {productSheet.tags?.map((tagId) => {
            const tag = tags.find(t => t.id === tagId);
            return tag ? <TagBadge key={tagId} tag={tag} size="sm" /> : null;
          })}
          {(!productSheet.tags || productSheet.tags.length === 0) && (
            <span className="text-xs text-muted-foreground">No categories</span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductSheetCard;
