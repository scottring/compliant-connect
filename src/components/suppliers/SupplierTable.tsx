import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Company, RelationshipStatus, RelationshipType } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const getStatusColor = (status: RelationshipStatus) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'blocked':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: RelationshipType) => {
  switch (type) {
    case 'direct':
      return 'bg-blue-100 text-blue-800';
    case 'indirect':
      return 'bg-purple-100 text-purple-800';
    case 'potential':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const SupplierTable: React.FC<SupplierTableProps> = ({ suppliers, onAction }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] = useState<Company[]>(suppliers);
  const navigate = useNavigate();

  React.useEffect(() => {
    setFilteredSuppliers(
      suppliers.filter((supplier) =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, suppliers]);

  const handleRowClick = (supplier: Company) => {
    navigate(`/suppliers/${supplier.id}`);
  };

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
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <TableRow 
                  key={supplier.id} 
                  className="transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleRowClick(supplier)}
                >
                  <TableCell className="font-medium">{supplier.id}</TableCell>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <TaskProgress value={supplier.progress} />
                  </TableCell>
                  <TableCell>{supplier.contactName}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(supplier.relationship?.status || 'inactive')}`}>
                      {supplier.relationship?.status || 'No Status'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getTypeColor(supplier.relationship?.type || 'potential')}`}>
                      {supplier.relationship?.type || 'Potential'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction(supplier);
                      }}
                      variant="secondary"
                      size="sm"
                      className="bg-brand hover:bg-brand-700 text-white"
                    >
                      Action
                    </Button>
                  </TableCell>
                </TableRow>
              )) 
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No suppliers found. Add your first supplier to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SupplierTable;
