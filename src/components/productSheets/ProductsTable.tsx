
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import TagBadge from "@/components/tags/TagBadge";
import { Tag } from "@/types";

interface ProductsTableProps {
  productSheets: any[];
  getCompanyName: (supplierId: string) => string;
  getCompletionRate: (sheet: any) => number;
  getSheetTags: (sheet: any) => Tag[];
  onRowClick: (sheet: any) => void;
  onAction: (e: React.MouseEvent, sheet: any, action: string) => void;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  productSheets,
  getCompanyName,
  getCompletionRate,
  getSheetTags,
  onRowClick,
  onAction,
}) => {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Supplier Name</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Task Progress</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productSheets.length > 0 ? (
            productSheets.map((sheet) => (
              <TableRow 
                key={sheet.id} 
                className="cursor-pointer hover:bg-muted/60"
                onClick={() => onRowClick(sheet)}
              >
                <TableCell className="font-medium">{sheet.name}</TableCell>
                <TableCell>{getCompanyName(sheet.supplierId)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getSheetTags(sheet).map((tag: Tag) => (
                      <TagBadge key={tag.id} tag={tag} size="sm" />
                    ))}
                    {(!sheet.tags || sheet.tags.length === 0) && (
                      <span className="text-muted-foreground text-xs">No tags</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Progress value={getCompletionRate(sheet)} className="h-2 w-[100px]" />
                </TableCell>
                <TableCell>
                  {sheet.updatedAt 
                    ? format(new Date(sheet.updatedAt), "yyyy-MM-dd") 
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      onClick={(e) => onAction(e, sheet, "view")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                    >
                      View
                    </Button>
                    <Button 
                      onClick={(e) => onAction(e, sheet, "request-update")}
                      variant="outline"
                      size="sm"
                    >
                      Request Update
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                No product sheets found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductsTable;
