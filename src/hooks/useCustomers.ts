
import { useState, useEffect } from "react";
import { supabase, CustomerWithPurchases } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const useCustomers = () => {
  const [customers, setCustomers] = useState<CustomerWithPurchases[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCustomers = async () => {
    if (!user) return;

    try {
      console.log('Fetching all customers from all users');
      
      // Fetch ALL customers from all users (as shown in the design)
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          purchases (amount)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }

      console.log('Customers fetched:', data);

      const customersWithTotals = data?.map(customer => ({
        ...customer,
        total_purchases: customer.purchases?.reduce((sum: number, purchase: any) => sum + purchase.amount, 0) || 0
      })) || [];

      setCustomers(customersWithTotals);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchCustomers();

    // Set up real-time subscription for customer updates with error handling
    const channel = supabase
      .channel('customers-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        () => {
          console.log('Customer data changed, refreshing...');
          fetchCustomers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        () => {
          console.log('Purchase data changed, refreshing...');
          fetchCustomers();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to customer updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    customers,
    loading,
    fetchCustomers
  };
};
