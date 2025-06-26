
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
      // Fetch only customers belonging to the current user
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          purchases (amount)
        `)
        .eq('user_id', user.id) // Filter by current user
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customersWithTotals = data.map(customer => ({
        ...customer,
        total_purchases: customer.purchases.reduce((sum: number, purchase: any) => sum + purchase.amount, 0)
      }));

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
    fetchCustomers();
  }, [user]);

  return {
    customers,
    loading,
    fetchCustomers
  };
};
