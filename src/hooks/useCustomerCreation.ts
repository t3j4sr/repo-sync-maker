
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
    if (!user) {
      console.error('No user found');
      return;
    }

    setLoading(true);
    try {
      console.log('Adding customer:', formData);
      
      const formattedPhone = formatPhoneNumber(formData.phone);
      const purchaseAmount = parseFloat(formData.purchaseAmount) || 0;
      
      console.log('Formatted data:', { formattedPhone, purchaseAmount });

      // Check if customer with this phone already exists
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

      // Create the customer record
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
        console.error('Customer creation error:', customerError);
        throw new Error(`Failed to create customer: ${customerError.message}`);
      }

      console.log('Customer created successfully:', customer);

      // Try to create authentication account for the customer (non-blocking)
      let customerAuthId = null;
      try {
        customerAuthId = await createCustomerAuthAccount(customer.id, formattedPhone, formData.name);
        console.log('Customer auth account created:', customerAuthId);
      } catch (authError) {
        console.error('Auth account creation failed (continuing):', authError);
      }
      
      let scratchCardsGenerated = false;

      // Handle initial purchase if provided
      if (customer && purchaseAmount > 0) {
        try {
          console.log('Creating initial purchase:', { customerId: customer.id, amount: purchaseAmount, userId: user.id });
          
          // Create purchase using the service
          const purchaseData = await createPurchase(customer.id, purchaseAmount, user.id);
          console.log('Purchase record created successfully:', purchaseData);

          // Generate scratch cards if purchase is over 150
          if (purchaseAmount > 150) {
            try {
              const scratchResult = await handleScratchCardsForPurchase(
                customer.id,
                formData.name,
                formattedPhone,
                purchaseAmount
              );

              if (scratchResult.cardsGenerated > 0) {
                scratchCardsGenerated = true;
                console.log('Scratch cards generated:', scratchResult.cardsGenerated);
              }
            } catch (scratchError) {
              console.error('Error generating scratch cards:', scratchError);
            }
          }

          // Log purchase activity
          try {
            await logActivity(
              'purchase_added',
              'purchase',
              purchaseData.id,
              `Added initial purchase of Rs ${purchaseAmount} for ${formData.name}`,
              { 
                customer_id: customer.id,
                customer_name: formData.name,
                amount: purchaseAmount,
                eligible_for_scratch_cards: purchaseAmount > 150
              }
            );
            console.log('Initial purchase activity logged');
          } catch (activityError) {
            console.error('Error logging initial purchase activity:', activityError);
          }
        } catch (purchaseError) {
          console.error('Purchase creation error:', purchaseError);
          toast({
            title: "Customer Added",
            description: `${formData.name} has been added, but there was an issue with the purchase: ${purchaseError.message}. You can add the purchase separately.`,
            variant: "destructive",
          });
        }
      }

      // Send welcome SMS only if no scratch cards were generated
      if (!scratchCardsGenerated) {
        try {
          await sendWelcomeSMS(formattedPhone, formData.name);
          console.log('Welcome SMS sent');
        } catch (smsError) {
          console.error('SMS sending failed, but continuing with customer creation:', smsError);
        }
      }

      // Log the customer creation activity
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
            customer_auth_id: customerAuthId,
            initial_purchase: purchaseAmount,
            scratch_cards_generated: scratchCardsGenerated
          }
        );
        console.log('Customer creation activity logged');
      } catch (activityError) {
        console.error('Error logging customer creation activity:', activityError);
      }

      const successMessage = scratchCardsGenerated 
        ? `${formData.name} has been added and scratch cards have been sent via SMS!`
        : `${formData.name} has been added successfully!`;

      toast({
        title: "Customer Added Successfully",
        description: successMessage,
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding customer:', error);
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
