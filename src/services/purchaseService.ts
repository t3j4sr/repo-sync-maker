
import { supabase } from "@/lib/supabase";

export const createPurchase = async (customerId: string, amount: number, userId: string) => {
  try {
    console.log('Creating purchase:', { customerId, amount, userId });
    
    const { data, error } = await supabase
      .from('purchases')
      .insert([
        {
          customer_id: customerId,
          amount: amount,
          user_id: userId,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Purchase creation error:', error);
      throw error;
    }

    console.log('Purchase created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};
