
import { useMemo } from "react";
import { CustomerWithPurchases } from "@/lib/supabase";

export const useCustomerFiltering = (customers: CustomerWithPurchases[], searchQuery: string) => {
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const searchLower = searchQuery.toLowerCase().trim();
      const nameLower = customer.name.toLowerCase();
      const phoneNumber = customer.phone;
      
      return nameLower.includes(searchLower) || phoneNumber.includes(searchQuery);
    });
  }, [customers, searchQuery]);

  const groupedCustomers = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    return {
      today: filteredCustomers.filter(customer => 
        new Date(customer.created_at).toDateString() === today
      ),
      yesterday: filteredCustomers.filter(customer => 
        new Date(customer.created_at).toDateString() === yesterday
      ),
      older: filteredCustomers.filter(customer => {
        const customerDate = new Date(customer.created_at).toDateString();
        return customerDate !== today && customerDate !== yesterday;
      })
    };
  }, [filteredCustomers]);

  return {
    filteredCustomers,
    groupedCustomers
  };
};
