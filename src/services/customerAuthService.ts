
import { supabase } from "@/lib/supabase";

export const createCustomerAuthAccount = async (customerId: string, phone: string, name: string) => {
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
