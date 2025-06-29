
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface AuthState {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useCustomerAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    customer: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const authenticateUser = async (phone: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Clean the phone number more thoroughly
      let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      // Remove any leading zeros or country code variations
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.substring(3);
      }
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.substring(2);
      }
      
      console.log('Searching for phone:', cleanPhone);
      
      // Check if customer exists with multiple phone format variations
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.eq.91${cleanPhone},phone.eq.0${cleanPhone}`);
      
      if (error) {
        console.error('Database error:', error);
        toast({
          title: "Database Error",
          description: "Failed to access customer database. Please try again.",
          variant: "destructive",
        });
        return { success: false };
      }

      if (!customers || customers.length === 0) {
        toast({
          title: "Customer Not Found",
          description: "This mobile number is not registered with us.",
          variant: "destructive",
        });
        return { success: false };
      }

      const customer = customers[0];
      
      setAuthState({
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone
        },
        isAuthenticated: true,
        isLoading: false,
      });

      // Store authenticated customer
      localStorage.setItem('customer', JSON.stringify(customer));

      toast({
        title: "Welcome!",
        description: `Hello ${customer.name}, access your scratch cards below.`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error authenticating user:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate user. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const logout = () => {
    setAuthState({
      customer: null,
      isAuthenticated: false,
      isLoading: false,
    });
    localStorage.removeItem('customer');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const checkStoredAuth = () => {
    try {
      const storedCustomer = localStorage.getItem('customer');
      if (storedCustomer) {
        const customer = JSON.parse(storedCustomer);
        setAuthState(prev => ({
          ...prev,
          customer,
          isAuthenticated: true,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error checking stored auth:', error);
      localStorage.removeItem('customer');
    }
  };

  return {
    ...authState,
    authenticateUser,
    logout,
    checkStoredAuth,
  };
};
