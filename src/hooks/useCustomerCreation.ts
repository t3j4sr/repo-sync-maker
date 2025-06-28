
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
    let customerCreated = false;
    let customerId = null;

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
      customerCreated = true;
      customerId = customer.id;

      // Try to create authentication account for the customer (non-blocking)
      let customerAuthId = null;
      try {
        customerAuthId = await createCustomerAuthAccount(customer.id, formattedPhone, formData.name);
        console.log('Customer auth account created:', customerAuthId);
      } catch (authError) {
        console.error('Auth account creation failed (continuing):', authError);
      }
      
      let scratchCardsGenerated = false;
      let purchaseCreated = false;

      // Handle initial purchase if provided - ALWAYS CREATE PURCHASE FOR ANY AMOUNT > 0
      if (customer && purchaseAmount > 0) {
        try {
          console.log('=== PURCHASE CREATION DEBUG ===');
          console.log('Creating initial purchase:', { customerId: customer.id, amount: purchaseAmount, userId: user.id });
          
          // Create purchase using the service with detailed logging
          const purchaseData = await createPurchase(customer.id, purchaseAmount, user.id);
          console.log('Purchase record created successfully:', purchaseData);
          purchaseCreated = true;

          // ALWAYS generate scratch cards regardless of amount
          try {
            console.log('Generating scratch cards for purchase...');
            const scratchResult = await handleScratchCardsForPurchase(
              customer.id,
              formData.name,
              formattedPhone,
              purchaseAmount
            );

            if (scratchResult.success && scratchResult.cardsGenerated > 0) {
              scratchCardsGenerated = true;
              console.log('Scratch cards generated:', scratchResult.cardsGenerated);
            }
          } catch (scratchError) {
            console.error('Error generating scratch cards (non-blocking):', scratchError);
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
                scratch_cards_generated: scratchCardsGenerated
              }
            );
            console.log('Initial purchase activity logged');
          } catch (activityError) {
            console.error('Error logging initial purchase activity:', activityError);
          }
        } catch (purchaseError) {
          console.error('=== PURCHASE CREATION FAILED ===');
          console.error('Purchase creation error:', purchaseError);
          console.error('Error details:', {
            message: purchaseError.message,
            code: purchaseError.code,
            details: purchaseError.details
          });
          
          toast({
            title: "Customer Added",
            description: `${formData.name} has been added, but there was an issue creating the purchase: ${purchaseError.message}. You can add the purchase separately.`,
            variant: "destructive",
          });
        }
      }

      // Send welcome SMS only if no scratch cards were generated
      if (!scratchCardsGenerated) {
        try {
          console.log('Sending welcome SMS...');
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
            purchase_created: purchaseCreated,
            scratch_cards_generated: scratchCardsGenerated
          }
        );
        console.log('Customer creation activity logged');
      } catch (activityError) {
        console.error('Error logging customer creation activity:', activityError);
      }

      const successMessage = scratchCardsGenerated 
        ? `${formData.name} has been added and scratch cards have been sent via SMS!`
        : purchaseCreated
        ? `${formData.name} has been added with purchase of Rs ${purchaseAmount}!`
        : `${formData.name} has been added successfully!`;

      toast({
        title: "Customer Added Successfully",
        description: successMessage,
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding customer:', error);
      
      // If customer was created but purchase failed, still consider it a partial success
      if (customerCreated && customerId) {
        toast({
          title: "Partial Success",
          description: `Customer ${formData.name} was created but there were issues with additional operations. Check the console for details.`,
          variant: "destructive",
        });
        onSuccess(); // Still call success to refresh the list
      } else {
        toast({
          title: "Error",
          description: `Failed to add customer: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createCustomer
  };
};
