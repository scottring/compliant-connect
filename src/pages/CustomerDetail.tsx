import React from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/supabase';
import { Loader2 } from 'lucide-react';

type Company = Database['public']['Tables']['companies']['Row'];

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch customer details
  const fetchCustomerDetails = async (customerId: string): Promise<Company | null> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      console.error("Error fetching customer details:", error);
      throw new Error(error.message);
    }
    return data;
  };

  const { data: customer, isLoading, error } = useQuery<Company | null, Error>({
    queryKey: ['customerDetails', id],
    queryFn: () => fetchCustomerDetails(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center p-8">Error loading customer details: {error.message}</div>;
  }

  if (!customer) {
    return <div className="text-center p-8">Customer not found.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name || 'Customer Detail'}
        subtitle={`Details for customer ID: ${customer.id}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Primary Contact</p>
            <p>{customer.contact_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p>{customer.contact_email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p>{customer.contact_phone || 'N/A'}</p>
          </div>
          {/* Add more fields as needed */}
        </CardContent>
      </Card>

      {/* Add more sections/cards for other details like related PIRs, etc. */}
    </div>
  );
};

export default CustomerDetail;