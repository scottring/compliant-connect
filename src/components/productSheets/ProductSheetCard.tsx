
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ProductSheet } from "@/types";
import { useApp } from "@/context/AppContext";
import TagBadge from "@/components/tags/TagBadge";

interface ProductSheetCardProps {
  productSheet: ProductSheet;
  onClick?: () => void;
}

const ProductSheetCard: React.FC<ProductSheetCardProps> = ({ 
  productSheet, 
  onClick 
}) => {
  const { companies, tags } = useApp();
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/product-sheet/${productSheet.id}`);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-200 text-gray-800";
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "reviewing":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Find the supplier
  const supplier = companies.find(company => company.id === productSheet.supplierId);
  
  // Get formatted dates
  const createdDate = productSheet.createdAt ? new Date(productSheet.createdAt).toLocaleDateString() : "Unknown";
  const updatedDate = productSheet.updatedAt ? new Date(productSheet.updatedAt).toLocaleDateString() : "Unknown";

  // Get tag objects from tag IDs
  const productTags = Array.isArray(productSheet.tags) 
    ? typeof productSheet.tags[0] === 'string' 
      ? (productSheet.tags as string[]).map(tagId => tags.find(t => t.id === tagId)).filter(Boolean) 
      : productSheet.tags as unknown as typeof tags
    : [];

  return (
    <Card 
      className="h-full overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-1" title={productSheet.name}>
            {productSheet.name}
          </CardTitle>
          <Badge className={`${getStatusColor(productSheet.status)}`}>
            {productSheet.status.charAt(0).toUpperCase() + productSheet.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="text-sm text-muted-foreground mb-3">
          Supplier: {supplier?.name || "Unknown"}
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2">
          {productTags.map(tag => (
            tag && <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
        </div>
        
        {productSheet.description && (
          <p className="text-sm line-clamp-2 text-muted-foreground">
            {productSheet.description}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground pt-0">
        <div className="w-full flex justify-between">
          <span>Created: {createdDate}</span>
          <span>Updated: {updatedDate}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductSheetCard;
