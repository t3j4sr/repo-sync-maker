
import { supabase } from '@/integrations/supabase/client';
import { CustomerScratchCards } from '@/types/scratchCard';
import { cleanScratchCard } from '@/utils/scratchCardUtils';
import { toast } from 'sonner';

export const fetchCustomerScratchCards = async (phone: string): Promise<CustomerScratchCards | null> => {
  try {
    // Clean the phone number - remove all non-digit characters
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    console.log('Searching for phone:', cleanPhone);
    
    if (!cleanPhone) {
      throw new Error('Phone number is required');
    }

    // Search for customer by phone number with various formats
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, phone')
      .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.eq.91${cleanPhone},phone.like.%${cleanPhone}`);

    console.log('Customer search result:', customers);

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      throw new Error('Failed to find customer');
    }

    if (!customers || customers.length === 0) {
      console.log('No customer found for phone:', cleanPhone);
      throw new Error('Customer not found');
    }

    const customer = customers[0];
    console.log('Found customer:', customer);

    // Get scratch cards for the customer
    const { data: cards, error: cardsError } = await supabase
      .from('scratch_cards')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    console.log('All scratch cards for customer:', cards);

    if (cardsError) {
      console.error('Error fetching scratch cards:', cardsError);
      throw new Error('Failed to load scratch cards');
    }

    // If no cards found, try searching by phone number across all customers
    if (!cards || cards.length === 0) {
      console.log('No cards found for customer ID:', customer.id);
      
      // Get all customer IDs that match this phone
      const customerIds = customers.map(c => c.id);
      console.log('All customer IDs for this phone:', customerIds);

      // Search for scratch cards using all possible customer IDs
      const { data: allCards, error: allCardsError } = await supabase
        .from('scratch_cards')
        .select('*')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      console.log('All possible scratch cards:', allCards);

      if (allCardsError) {
        console.error('Error fetching all scratch cards:', allCardsError);
        throw new Error('Failed to load scratch cards');
      }

      if (allCards && allCards.length > 0) {
        const cleanedAllCards = allCards.map(cleanScratchCard);

        return {
          customer_id: customer.id,
          customer_name: customer.name,
          scratch_cards: cleanedAllCards
        };
      }
    }
    
    // Ensure main cards have expires_at field
    const cleanedCards = (cards || []).map(cleanScratchCard);

    const result = {
      customer_id: customer.id,
      customer_name: customer.name,
      scratch_cards: cleanedCards
    };
    
    console.log('Final scratch cards data:', result);
    
    return result;
  } catch (err) {
    console.error('Error in fetchCustomerScratchCards:', err);
    throw err;
  }
};

export const scratchCardById = async (cardId: string): Promise<boolean> => {
  try {
    console.log('Attempting to scratch card:', cardId);
    
    // First check if card is already scratched
    const { data: existingCard, error: checkError } = await supabase
      .from('scratch_cards')
      .select('is_scratched')
      .eq('id', cardId)
      .single();

    if (checkError) {
      console.error('Error checking card status:', checkError);
      toast.error('Failed to check card status');
      return false;
    }

    if (existingCard?.is_scratched) {
      console.log('Card already scratched');
      toast.error('Card has already been scratched');
      return false;
    }
    
    // Set scratch time to NOW and expiration time to exactly 60 minutes from NOW
    const scratchTime = new Date();
    const expiresAt = new Date(scratchTime.getTime() + 60 * 60 * 1000); // 60 minutes from now
    
    console.log('Setting scratch time:', scratchTime.toISOString());
    console.log('Setting expires at:', expiresAt.toISOString());
    
    // Update the scratch card status in the database
    const { error } = await supabase
      .from('scratch_cards')
      .update({ 
        is_scratched: true, 
        scratched_at: scratchTime.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq('id', cardId);

    if (error) {
      console.error('Error updating scratch card:', error);
      toast.error('Failed to scratch card');
      return false;
    }

    toast.success('Card scratched successfully! Valid for 60 minutes.');
    return true;
  } catch (err) {
    console.error('Error scratching card:', err);
    toast.error('Failed to scratch card');
    return false;
  }
};
