
import { supabase } from "@/lib/supabase";

export const createPurchase = async (customerId: string, amount: number, userId: string) => {
  console.log('Creating purchase with inputs:', { customerId, amount, userId });
  
  // Validate inputs
  if (!customerId || !userId) {
    throw new Error('Customer ID and User ID are required');
  }
  
  if (!amount || amount <= 0) {
    throw new Error('Purchase amount must be greater than 0');
  }

  // Ensure amount is a valid number
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    throw new Error('Purchase amount must be a valid number');
  }

  // Use the IDs exactly as received - no processing at all
  const purchaseData = {
    customer_id: customerId,
    amount: numericAmount,
    user_id: userId,
  };

  console.log('Final purchase data for insert:', purchaseData);

  try {
    // Create purchase record in the purchases table
    const { data, error } = await supabase
      .from('purchases')
      .insert(purchaseData)
      .select()
      .single();

    if (error) {
      console.error('Supabase purchase creation error:', error);
      throw new Error(`Failed to create purchase: ${error.message}`);
    }

    console.log('Purchase created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createPurchase:', error);
    throw error;
  }
};
