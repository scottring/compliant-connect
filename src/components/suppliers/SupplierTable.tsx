
import React, { useState } from "react";
import { Company } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TaskProgress from "@/components/ui/progress/TaskProgress";
import { Input } from "@/components/ui/input";

interface SupplierTableProps {
  suppliers: Company[];
  onAction: (supplier: Company) => void;
}

const SupplierTable: React.FC<SupplierTableProps> = ({ suppliers, onAction }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] = useState<Company[]>(suppliers);

  React.useEffect(() => {
    setFilteredSuppliers(
      suppliers.filter((supplier) =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, suppliers]);

  return (
    <div className="w-full animate-fade-in">
      <div className="flex items-center mb-4">
        <div className="relative w-full max-w-md">
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <Button variant="outline" className="ml-2">
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
          <span className="ml-2">Filter</span>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Supplier ID</TableHead>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Task Progress</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="font-medium">{supplier.id.padStart(3, '0')}</TableCell>
                <TableCell>{supplier.name}</TableCell>
                <TableCell className="max-w-[200px]">
                  <TaskProgress value={supplier.progress} />
                </TableCell>
                <TableCell>{supplier.contactName}</TableCell>
                <TableCell className="text-right">
                  <Button
                    onClick={() => onAction(supplier)}
                    variant="secondary"
                    size="sm"
                    className="bg-brand hover:bg-brand-700 text-white"
                  >
                    Action
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SupplierTable;
