import { Company } from "@/types/auth";

interface SupplierCardProps {
  supplier: Company;
  onClick?: (supplier: Company) => void; // Add optional onClick prop
}

export const SupplierCard = ({ supplier, onClick }: SupplierCardProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(supplier);
    }
  };

  return (
    <div
      className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" // Add cursor-pointer and hover effect
      onClick={handleClick} // Attach onClick handler
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
    </div>
  );
}; 