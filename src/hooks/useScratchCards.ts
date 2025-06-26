
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ScratchCard {
  id: string;
  code: string;
  is_scratched: boolean;
  scratched_at: string | null;
  created_at: string;
  customer_id: string;
  prize_type: string;
  prize_value: number;
  expires_at: string;
}

export const useScratchCards = () => {
  const [scratchCards, setScratchCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchScratchCards = async (customerId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scratch_cards')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching scratch cards:', error);
        toast({
          title: "Error",
          description: "Failed to load scratch cards",
          variant: "destructive",
        });
        return;
      }

      setScratchCards(data || []);
    } catch (error) {
      console.error('Error fetching scratch cards:', error);
      toast({
        title: "Error",
        description: "Failed to load scratch cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateScratchCards = async (customerId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_scratch_cards_for_customer', {
        customer_uuid: customerId
      });

      if (error) {
        console.error('Error generating scratch cards:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error generating scratch cards:', error);
      return 0;
    }
  };

  const markCardAsScratched = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('scratch_cards')
        .update({ 
          is_scratched: true, 
          scratched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
        })
        .eq('id', cardId);

      if (error) {
        console.error('Error marking card as scratched:', error);
        toast({
          title: "Error",
          description: "Failed to update scratch card",
          variant: "destructive",
        });
        return false;
      }

      // Update local state
      setScratchCards(prev => 
        prev.map(card => 
          card.id === cardId 
            ? { 
                ...card, 
                is_scratched: true, 
                scratched_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
              }
            : card
        )
      );

      return true;
    } catch (error) {
      console.error('Error marking card as scratched:', error);
      return false;
    }
  };

  const cleanupExpiredCards = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_scratch_cards');
      if (error) {
        console.error('Error cleaning up expired cards:', error);
      } else {
        console.log('Cleaned up expired cards:', data);
      }
      return data || 0;
    } catch (error) {
      console.error('Error cleaning up expired cards:', error);
      return 0;
    }
  };

  return {
    scratchCards,
    loading,
    fetchScratchCards,
    generateScratchCards,
    markCardAsScratched,
    cleanupExpiredCards
  };
};
