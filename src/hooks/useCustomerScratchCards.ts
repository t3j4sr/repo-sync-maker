
import { useState, useEffect } from 'react';
import { CustomerScratchCards } from '@/types/scratchCard';
import { fetchCustomerScratchCards, scratchCardById } from '@/services/scratchCardService';
import { isCardExpired, getTimeRemaining } from '@/utils/scratchCardUtils';

export const useCustomerScratchCards = (phone: string) => {
  const [scratchCards, setScratchCards] = useState<CustomerScratchCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScratchCards = async () => {
    try {
      setLoading(true);
      const result = await fetchCustomerScratchCards(phone);
      setScratchCards(result);
      setError(null);
    } catch (err) {
      console.error('Error in fetchScratchCards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scratch cards');
      setScratchCards(null);
    } finally {
      setLoading(false);
    }
  };

  const scratchCard = async (cardId: string) => {
    if (!scratchCards) return false;

    const success = await scratchCardById(cardId);
    
    if (success) {
      // Refetch the cards from the database to get the exact timestamps that were saved
      await fetchScratchCards();
    }

    return success;
  };

  useEffect(() => {
    if (phone) {
      console.log('Phone changed, fetching scratch cards for:', phone);
      fetchScratchCards();
    }
  }, [phone]);

  return {
    scratchCards,
    loading,
    error,
    scratchCard,
    refetchCards: fetchScratchCards,
    isCardExpired,
    getTimeRemaining
  };
};
