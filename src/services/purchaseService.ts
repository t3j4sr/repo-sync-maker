import { supabase } from "@/lib/supabase";

export const createPurchase = async (customerId: string, amount: number, userId: string) => {
  try {
    console.log('Creating purchase:', { customerId, amount, userId, amountType: typeof amount });
    
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

    console.log('Validated data:', { customerId, amount: numericAmount, userId, amountType: typeof numericAmount });

    // Create purchase record in the purchases table
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        customer_id: customerId,
        amount: numericAmount,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Purchase creation error:', error);
      throw new Error(`Failed to create purchase: ${error.message}`);
    }

    console.log('Purchase created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};
