import { Company } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Building2, Mail, Phone, Tag, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SupplierCardProps {
  supplier: Company;
  onClick?: (supplier: Company) => void;
  onEdit?: (supplier: Company) => void;
  onDelete?: (supplier: Company) => void;
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
    <motion.div
      className="group relative overflow-hidden rounded-xl border border-border bg-background p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/20"
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Decorative corner accent */}
      <div className="absolute -top-1 -right-1 h-16 w-16 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl" />
      
      {/* Company name with icon */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{supplier.name}</h3>
      </div>
      
      {/* Contact information with icons */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="h-3.5 w-3.5 text-primary/70" />
          <span className="font-medium">Contact:</span>
          <span>{supplier.contact_name || 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3.5 w-3.5 text-primary/70" />
          <span className="font-medium">Email:</span>
          <span className="truncate">{supplier.contact_email || 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5 text-primary/70" />
          <span className="font-medium">Phone:</span>
          <span>{supplier.contact_phone || 'N/A'}</span>
        </div>
      </div>
      
      {/* Relationship status with subtle styling */}
      {supplier.relationship && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Status:</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                supplier.relationship.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                supplier.relationship.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
              )}>
                {supplier.relationship.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <div className="h-3.5 w-3.5" /> {/* Spacer for alignment */}
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Type:</span>
              <span className="text-foreground">{supplier.relationship.type}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons with improved styling and animations */}
      <motion.div 
        className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 0 }}
        whileHover={{ opacity: 1, y: 0 }}
      >
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:text-primary"
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
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label="Delete Supplier"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};

// Example usage
export default function SupplierCardExample() {
  const exampleSupplier: Company = {
    id: "1",
    name: "Acme Supplies Inc.",
    contact_name: "John Doe",
    contact_email: "john@acmesupplies.com",
    contact_phone: "+1 (555) 123-4567",
    relationship: {
      id: "rel-123", // Added dummy id
      customer_id: "cust-abc", // Added dummy customer_id
      supplier_id: "1", // Added dummy supplier_id (matches exampleSupplier.id)
      status: "active",
      type: "direct", 
      created_at: new Date().toISOString(), // Added dummy created_at
      updated_at: new Date().toISOString() // Added dummy updated_at
    }
  };

  return (
    <div className="p-8 max-w-md">
      <SupplierCard 
        supplier={exampleSupplier} 
        onClick={(supplier) => console.log("Clicked:", supplier.name)}
        onEdit={(supplier) => console.log("Edit:", supplier.name)}
        onDelete={(supplier) => console.log("Delete:", supplier.name)}
      />
    </div>
  );
}
