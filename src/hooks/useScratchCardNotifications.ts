
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useScratchCardNotifications = () => {
  useEffect(() => {
    // Listen for new eligible customers being created
    const channel = supabase
      .channel('eligible_customers_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eligible_customers'
        },
        async (payload) => {
          console.log('New eligible customer created:', payload.new);
          
          // Send SMS notification
          try {
            const { error } = await supabase.functions.invoke('send-scratch-card-sms', {
              body: {
                name: payload.new.name,
                phone: payload.new.phone,
                scratch_card_code: payload.new.scratch_card_code
              }
            });

            if (error) {
              console.error('Error sending SMS:', error);
            } else {
              console.log('SMS sent successfully');
            }
          } catch (err) {
            console.error('Failed to send SMS:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
