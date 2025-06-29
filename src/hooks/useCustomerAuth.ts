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
  otpSent: boolean;
  pendingPhone: string;
}

export const useCustomerAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    customer: null,
    isAuthenticated: false,
    isLoading: false,
    otpSent: false,
    pendingPhone: '',
  });

  const sendOTP = async (phone: string) => {
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

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Format phone for SMS (ensure it has +91 prefix)
      const smsPhone = cleanPhone.startsWith('+91') ? cleanPhone : `+91${cleanPhone}`;
      
      console.log('Sending OTP to:', smsPhone);
      
      // Send OTP via Supabase Edge Function
      const { data, error: otpError } = await supabase.functions.invoke('send-otp', {
        body: { 
          phone: smsPhone, 
          otp 
        }
      });

      if (otpError) {
        console.error('OTP sending error:', otpError);
        toast({
          title: "SMS Error",
          description: "Failed to send OTP. Please try again or contact support.",
          variant: "destructive",
        });
        return { success: false };
      }

      // Store OTP in localStorage temporarily (in production, use secure storage)
      localStorage.setItem('pending_otp', otp);
      localStorage.setItem('pending_customer', JSON.stringify(customers[0]));
      
      setAuthState(prev => ({ 
        ...prev, 
        otpSent: true, 
        pendingPhone: cleanPhone,
        isLoading: false 
      }));

      toast({
        title: "OTP Sent",
        description: "Please check your phone for the verification code.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const verifyOTP = async (otp: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const storedOtp = localStorage.getItem('pending_otp');
      const storedCustomer = localStorage.getItem('pending_customer');
      
      if (!storedOtp || !storedCustomer) {
        toast({
          title: "Session Expired",
          description: "Please request a new OTP.",
          variant: "destructive",
        });
        return { success: false };
      }

      if (otp !== storedOtp) {
        toast({
          title: "Invalid OTP",
          description: "Please enter the correct verification code.",
          variant: "destructive",
        });
        return { success: false };
      }

      const customer = JSON.parse(storedCustomer);
      
      setAuthState({
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone
        },
        isAuthenticated: true,
        isLoading: false,
        otpSent: false,
        pendingPhone: '',
      });

      // Store authenticated customer
      localStorage.setItem('customer', JSON.stringify(customer));
      // Clean up temporary storage
      localStorage.removeItem('pending_otp');
      localStorage.removeItem('pending_customer');

      toast({
        title: "Welcome!",
        description: `Hello ${customer.name}, access your scratch cards below.`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
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
      otpSent: false,
      pendingPhone: '',
    });
    localStorage.removeItem('customer');
    localStorage.removeItem('pending_otp');
    localStorage.removeItem('pending_customer');
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

  const resendOTP = () => {
    if (authState.pendingPhone) {
      return sendOTP(authState.pendingPhone);
    }
    return { success: false };
  };

  return {
    ...authState,
    sendOTP,
    verifyOTP,
    resendOTP,
    logout,
    checkStoredAuth,
  };
};
