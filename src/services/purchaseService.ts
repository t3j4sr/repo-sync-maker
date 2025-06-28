
import { supabase } from "@/lib/supabase";

export const createPurchase = async (customerId: string, amount: number, userId: string) => {
  console.log('Creating purchase with inputs:', { customerId, amount, userId });
  
  // Basic validation
  if (!customerId || !userId || !amount || amount <= 0) {
    throw new Error('Invalid purchase data');
  }

  try {
    // Create purchase record directly with minimal processing
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        customer_id: customerId,
        amount: Number(amount),
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Purchase insert error:', error);
      throw error;
    }

    console.log('Purchase created:', data);
    return data;
  } catch (error) {
    console.error('Purchase creation failed:', error);
    throw error;
  }
};
