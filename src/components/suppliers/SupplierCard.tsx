import { Company } from "@/types/auth";

interface SupplierCardProps {
  supplier: Company;
}

export const SupplierCard = ({ supplier }: SupplierCardProps) => {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{supplier.name}</h3>
      <div className="mt-2 text-sm text-gray-600">
        <p>Contact: {supplier.contactName}</p>
        <p>Email: {supplier.contactEmail}</p>
        <p>Phone: {supplier.contactPhone}</p>
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