import { Company } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface SupplierCardProps {
  supplier: Company;
  onClick?: (supplier: Company) => void;
  onEdit?: (supplier: Company) => void; // Add onEdit prop
  onDelete?: (supplier: Company) => void; // Add onDelete prop
}

export const SupplierCard = ({ supplier, onClick, onEdit, onDelete }: SupplierCardProps) => {
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ensure clicks on buttons don't trigger the main card click
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onClick) {
      onClick(supplier);
    }
  };

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click
    if (onEdit) {
      onEdit(supplier);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click
    if (onDelete) {
      onDelete(supplier);
    }
  };

  return (
    <div
      className="group relative border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" // Add 'group' class here
      onClick={handleCardClick} // Attach main card click handler
    >
      <h3 className="text-lg font-semibold">{supplier.name}</h3>
      <div className="mt-2 text-sm text-gray-600">
        {/* Use camelCase based on Company type from src/types/auth.ts */}
        {/* Corrected to use snake_case from Company type */}
        <p>Contact: {supplier.contact_name || 'N/A'}</p>
        <p>Email: {supplier.contact_email || 'N/A'}</p>
        <p>Phone: {supplier.contact_phone || 'N/A'}</p>
        {supplier.relationship && (
          <div className="mt-2">
            <p>Status: {supplier.relationship.status}</p>
            <p>Type: {supplier.relationship.type}</p>
          </div>
        )}
      </div>
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleEditClick}
            aria-label="Edit Supplier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={handleDeleteClick}
            aria-label="Delete Supplier"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};