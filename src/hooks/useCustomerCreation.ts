
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useToast } from "@/hooks/use-toast";
import { createCustomerAuthAccount } from "@/services/customerAuthService";
import { useSMSService } from "@/services/smsService";
import { createPurchase } from "@/services/purchaseService";
import { useScratchCardService } from "@/services/scratchCardService";

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
  const { sendWelcomeSMS, sendScratchCardSMS } = useSMSService();
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
    if (!user) return;

    setLoading(true);
    try {
      console.log('Adding customer:', formData);
      
      const formattedPhone = formatPhoneNumber(formData.phone);
      const purchaseAmount = parseFloat(formData.purchaseAmount || '0');
      
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
      
      let scratchCardsGenerated = 0;
      let shouldSendScratchCardSMS = false;

      // Handle initial purchase if provided
      if (customer && purchaseAmount > 0) {
        const purchase = await createPurchase(customer.id, purchaseAmount, user.id);

        // ALWAYS generate scratch cards for ANY purchase amount > 0
        console.log('Generating scratch cards for purchase of Rs', purchaseAmount);
        
        try {
          const scratchResult = await handleScratchCardsForPurchase(
            customer.id,
            formData.name,
            formattedPhone,
            purchaseAmount
          );

          console.log('Scratch cards result:', scratchResult);

          if (scratchResult.cardsGenerated > 0) {
            scratchCardsGenerated = scratchResult.cardsGenerated;
            shouldSendScratchCardSMS = true;
            console.log('Will send scratch card SMS with', scratchCardsGenerated, 'cards');
          }
        } catch (scratchError) {
          console.error('Error generating scratch cards:', scratchError);
        }

        try {
          await logActivity(
            'purchase_added',
            'purchase',
            purchase.id,
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
      } else {
        // Even without purchase, generate 1 scratch card for new customers
        console.log('Generating welcome scratch card for new customer');
        
        try {
          const scratchResult = await handleScratchCardsForPurchase(
            customer.id,
            formData.name,
            formattedPhone,
            0 // No purchase amount
          );

          console.log('Welcome scratch cards result:', scratchResult);

          if (scratchResult.cardsGenerated > 0) {
            scratchCardsGenerated = scratchResult.cardsGenerated;
            shouldSendScratchCardSMS = true;
            console.log('Will send welcome scratch card SMS with', scratchCardsGenerated, 'cards');
          }
        } catch (scratchError) {
          console.error('Error generating welcome scratch cards:', scratchError);
        }
      }

      // Send scratch card SMS with link
      try {
        if (shouldSendScratchCardSMS && scratchCardsGenerated > 0) {
          console.log('Sending scratch card SMS with link');
          await sendScratchCardSMS(
            formattedPhone,
            formData.name,
            scratchCardsGenerated,
            purchaseAmount,
            true // indicates this is a welcome + scratch card SMS
          );
        } else {
          console.log('Sending regular welcome SMS');
          await sendWelcomeSMS(formattedPhone, formData.name);
        }
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
            customer_auth_id: customerAuthId,
            initial_purchase: purchaseAmount,
            scratch_cards_generated: scratchCardsGenerated
          }
        );
        console.log('Customer creation activity logged');
      } catch (activityError) {
        console.error('Error logging customer creation activity:', activityError);
      }

      const successMessage = shouldSendScratchCardSMS 
        ? `${formData.name} has been added and ${scratchCardsGenerated} scratch card${scratchCardsGenerated > 1 ? 's' : ''} have been sent via SMS!`
        : `${formData.name} has been added and can now login with their phone number using OTP`;

      toast({
        title: "Customer Added Successfully",
        description: successMessage,
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
