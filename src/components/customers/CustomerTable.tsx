
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Company } from "@/types/auth"; // Corrected import path
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
import { Search, Filter } from "lucide-react";

interface CustomerTableProps {
  customers: Company[];
  onAction: (customer: Company) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({ customers, onAction }) => {
  const [searchTerm, setSearchTerm] = useState("");
  // const [filteredCustomers, setFilteredCustomers] = useState<Company[]>(customers); // Remove state
  const navigate = useNavigate();

  // Calculate filtered list directly based on props and searchTerm state
  const filteredCustomers = React.useMemo(() => {
    if (!customers) return []; // Handle case where customers prop might initially be undefined
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contact_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contact_email && customer.contact_email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]); // Recalculate only when customers or searchTerm changes

  const handleRowClick = (customer: Company) => {
    navigate(`/customers/${customer.id}`);
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex items-center mb-4">
        <div className="relative w-full max-w-md">
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button variant="outline" className="ml-2 gap-2">
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Customer ID</TableHead>
              <TableHead>Customer Name</TableHead>
              {/* <TableHead>Task Progress</TableHead> */} {/* Removed Progress */}
              <TableHead>Primary Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Render based on the calculated filteredCustomers */}
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleRowClick(customer)}
                >
                  <TableCell className="font-medium">{customer.id.padStart(3, '0')}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  {/* <TableCell className="max-w-[200px]">
                    <TaskProgress value={customer.progress} />
                  </TableCell> */} {/* Removed Progress */}
                  <TableCell>{customer.contact_name}</TableCell> {/* Use snake_case */}
                  <TableCell className="text-right">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction(customer);
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
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground"> {/* Adjusted colSpan */}
                  {/* Check the length of the *filtered* list now */}
                  {filteredCustomers.length === 0 && searchTerm
                    ? "No customers match your search criteria."
                    : "No customers found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CustomerTable;
