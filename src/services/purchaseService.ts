
import { supabase } from "@/lib/supabase";

export const createPurchase = async (customerId: string, amount: number, userId: string) => {
  try {
    console.log('Creating purchase:', { customerId, amount, userId });
    
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

    console.log('Validated data:', { customerId, amount: numericAmount, userId });

    // Create purchase record in the purchases table
    // Using both user_id and created_by to ensure compatibility
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        customer_id: customerId,
        amount: numericAmount,
        user_id: userId,
        created_by: userId, // Adding this field as it might be expected
      })
      .select()
      .single();

    if (error) {
      console.error('Purchase creation error details:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create purchase: ${error.message} (Code: ${error.code})`);
    }

    if (!data) {
      console.error('No data returned from purchase creation');
      throw new Error('Purchase creation returned no data');
    }

    console.log('Purchase created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating purchase:', error);
    // Re-throw to ensure calling code can handle it
    throw error;
  }
};
