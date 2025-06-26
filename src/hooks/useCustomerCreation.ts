
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useToast } from "@/hooks/use-toast";

export interface CustomerFormData {
  name: string;
  phone: string;
  purchaseAmount: string;
}

export const useCustomerCreation = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const { toast } = useToast();

  const formatPhoneNumber = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.length === 10) {
      return `+91${cleanNumber}`;
    }
    
    if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
      return `+${cleanNumber}`;
    }
    
    if (cleanNumber.startsWith('+')) {
      return cleanNumber;
    }
    
    return `+91${cleanNumber}`;
  };

  const createCustomerAuthAccount = async (customerId: string, phone: string, name: string) => {
    try {
      console.log('Creating auth account for customer:', name, phone);
      
      // Use the database function to create customer auth account
      const { data, error } = await supabase.rpc('create_customer_auth_account', {
        p_customer_id: customerId,
        p_phone: phone,
        p_name: name
      });

      if (error) {
        console.error('Error creating customer auth account:', error);
        return null;
      }

      console.log('Customer auth account created with ID:', data);
      return data;
    } catch (error) {
      console.error('Failed to create customer auth account:', error);
      return null;
    }
  };

  const sendWelcomeSMS = async (phone: string, name: string) => {
    try {
      console.log('Attempting to send welcome SMS to:', phone, 'for:', name);
      
      const { data, error } = await supabase.functions.invoke('send-welcome-sms', {
        body: {
          phone: phone,
          name: name
        }
      });

      if (error) {
        console.error('SMS error details:', error);
        throw error;
      }

      console.log('SMS response:', data);
      
      if (data?.error) {
        if (data?.code === 21608) {
          toast({
            title: "SMS Warning",
            description: "Customer added successfully! SMS not sent - phone number needs verification in Twilio trial account.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "SMS Warning",
            description: `Customer added successfully! SMS error: ${data.error}`,
            variant: "destructive",
          });
        }
        return data;
      }
      
      toast({
        title: "Welcome SMS Sent",
        description: `Welcome message sent to ${phone}`,
      });
      
      return data;
    } catch (error) {
      console.error('Failed to send welcome SMS:', error);
      toast({
        title: "SMS Error",
        description: "Customer added successfully but welcome SMS could not be sent. Please check your Twilio configuration.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createCustomer = async (formData: CustomerFormData, onSuccess: () => void) => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Adding customer:', formData);
      
      const formattedPhone = formatPhoneNumber(formData.phone);
      
      // First create the customer record
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            name: formData.name,
            phone: formattedPhone,
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (customerError) {
        console.error('Customer creation error:', customerError);
        throw customerError;
      }

      console.log('Customer created successfully:', customer);

      // Create authentication account for the customer
      const customerAuthId = await createCustomerAuthAccount(customer.id, formattedPhone, formData.name);
      
      // Send welcome SMS
      try {
        await sendWelcomeSMS(formattedPhone, formData.name);
      } catch (smsError) {
        console.error('SMS sending failed, but continuing with customer creation:', smsError);
      }

      // Log the activity
      try {
        await logActivity(
          'customer_created',
          'customer',
          customer.id,
          `Added new customer: ${formData.name}`,
          { 
            customer_name: formData.name,
            customer_phone: formattedPhone,
            auth_account_created: !!customerAuthId,
            customer_auth_id: customerAuthId
          }
        );
        console.log('Customer creation activity logged');
      } catch (activityError) {
        console.error('Error logging customer creation activity:', activityError);
      }

      // Handle initial purchase if provided
      if (customer && formData.purchaseAmount && parseFloat(formData.purchaseAmount) > 0) {
        const { data: purchase, error: purchaseError } = await supabase
          .from('purchases')
          .insert([
            {
              customer_id: customer.id,
              amount: parseFloat(formData.purchaseAmount),
              user_id: user.id,
            }
          ])
          .select()
          .single();

        if (purchaseError) {
          console.error('Purchase creation error:', purchaseError);
          throw purchaseError;
        }

        try {
          await logActivity(
            'purchase_added',
            'purchase',
            purchase.id,
            `Added initial purchase of Rs ${formData.purchaseAmount} for ${formData.name}`,
            { 
              customer_id: customer.id,
              customer_name: formData.name,
              amount: parseFloat(formData.purchaseAmount)
            }
          );
          console.log('Initial purchase activity logged');
        } catch (activityError) {
          console.error('Error logging initial purchase activity:', activityError);
        }
      }

      toast({
        title: "Customer Added Successfully",
        description: `${formData.name} has been added and can now login with their phone number using OTP`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createCustomer
  };
};
