
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useToast } from "@/hooks/use-toast";
import { createCustomerAuthAccount } from "@/services/customerAuthService";
import { useSMSService } from "@/services/smsService";
import { useScratchCardService } from "@/services/scratchCardService";
import { createPurchase } from "@/services/purchaseService";

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
  const { sendWelcomeSMS } = useSMSService();
  const { handleScratchCardsForPurchase } = useScratchCardService();

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

  const createCustomer = async (formData: CustomerFormData, onSuccess: () => void) => {
    if (!user?.id) {
      console.error('No user ID available');
      toast({
        title: "Error",
        description: "User authentication required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(formData.phone);
      const purchaseAmount = parseFloat(formData.purchaseAmount) || 0;
      
      console.log('Creating customer:', { name: formData.name, phone: formattedPhone });

      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', formattedPhone)
        .single();

      if (existingCustomer) {
        toast({
          title: "Customer Already Exists",
          description: "A customer with this phone number already exists.",
          variant: "destructive",
        });
        return;
      }

      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: formData.name,
          phone: formattedPhone,
          user_id: user.id,
        })
        .select()
        .single();

      if (customerError) {
        throw new Error(`Customer creation failed: ${customerError.message}`);
      }

      console.log('Customer created:', customer);

      // Create auth account (non-blocking)
      try {
        await createCustomerAuthAccount(customer.id, formattedPhone, formData.name);
      } catch (authError) {
        console.error('Auth account creation failed:', authError);
      }

      // Create purchase if amount > 0
      let purchaseCreated = false;
      if (purchaseAmount > 0) {
        try {
          await createPurchase(customer.id, purchaseAmount, user.id);
          purchaseCreated = true;
          console.log('Purchase created successfully');

          // Generate scratch cards
          try {
            await handleScratchCardsForPurchase(
              customer.id,
              formData.name,
              formattedPhone,
              purchaseAmount
            );
          } catch (scratchError) {
            console.error('Scratch card generation failed:', scratchError);
          }
        } catch (purchaseError) {
          console.error('Purchase creation failed:', purchaseError);
          toast({
            title: "Partial Success",
            description: `Customer added but purchase failed: ${purchaseError.message}`,
            variant: "destructive",
          });
        }
      }

      // Send welcome SMS
      if (!purchaseCreated) {
        try {
          await sendWelcomeSMS(formattedPhone, formData.name);
        } catch (smsError) {
          console.error('SMS failed:', smsError);
        }
      }

      // Log activity
      try {
        await logActivity(
          'customer_created',
          'customer',
          customer.id,
          `Added new customer: ${formData.name}`,
          { 
            customer_name: formData.name,
            customer_phone: formattedPhone,
            initial_purchase: purchaseAmount,
            purchase_created: purchaseCreated
          }
        );
      } catch (activityError) {
        console.error('Activity logging failed:', activityError);
      }

      toast({
        title: "Success",
        description: `${formData.name} has been added successfully!`,
      });

      onSuccess();
    } catch (error) {
      console.error('Customer creation failed:', error);
      toast({
        title: "Error",
        description: `Failed to add customer: ${error.message}`,
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
