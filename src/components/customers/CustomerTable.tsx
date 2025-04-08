
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database } from "@/types/supabase"; // Import generated types
type Company = Database['public']['Tables']['companies']['Row']; // Use the generated Row type
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
  const [filteredCustomers, setFilteredCustomers] = useState<Company[]>(customers);
  const navigate = useNavigate();

  React.useEffect(() => {
    setFilteredCustomers(
      customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.contact_name && customer.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) || // Use contact_name
        (customer.contact_email && customer.contact_email.toLowerCase().includes(searchTerm.toLowerCase())) // Use contact_email
      )
    );
  }, [searchTerm, customers]);

  const handleRowClick = (customer: Company) => {
    navigate(`/customer/${customer.id}`); // Navigate to singular customer detail route
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
              {/* <TableHead className="w-[100px]">Customer ID</TableHead> */} {/* Removed Customer ID Header */}
              <TableHead>Customer Name</TableHead>
              <TableHead>Task Progress</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleRowClick(customer)}
                >
                  {/* <TableCell className="font-medium">{customer.id.padStart(3, '0')}</TableCell> */} {/* Removed Customer ID Cell */}
                  <TableCell>{customer.name}</TableCell>
                  <TableCell className="max-w-[200px]">
                    {/* <TaskProgress value={customer.progress} /> */} {/* 'progress' not in DB type */}
                    <span className="text-muted-foreground text-xs">N/A</span> {/* Placeholder */}
                  </TableCell>
                  <TableCell>{customer.contact_name || 'N/A'}</TableCell> {/* Use contact_name */}
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
                  {customers.length === 0 
                    ? "No customers found. Add your first customer to get started."
                    : "No customers match your search criteria."}
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
