
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export const useScratchCardSMS = () => {
  const { toast } = useToast();

  const sendScratchCardSMS = async (
    phone: string, 
    customerName: string, 
    cardsCount: number, 
    totalPurchase: number
  ) => {
    try {
      console.log('Sending scratch card SMS:', { phone, customerName, cardsCount, totalPurchase });
      
      const { data, error } = await supabase.functions.invoke('send-scratch-card-sms', {
        body: {
          phone,
          customerName,
          cardsCount,
          totalPurchase
        }
      });

      if (error) {
        console.error('SMS error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('SMS service error:', data.error);
        if (data.code === 21608) {
          toast({
            title: "SMS Warning",
            description: "Scratch cards generated! SMS not sent - phone number needs verification in Twilio trial account.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "SMS Warning", 
            description: `Scratch cards generated! SMS error: ${data.error}`,
            variant: "destructive",
          });
        }
        return data;
      }

      console.log('Scratch card SMS sent successfully:', data);
      toast({
        title: "Scratch Cards Generated!",
        description: `${cardsCount} scratch card${cardsCount > 1 ? 's' : ''} sent to ${customerName} via SMS`,
      });

      return data;
    } catch (error) {
      console.error('Failed to send scratch card SMS:', error);
      toast({
        title: "SMS Error",
        description: "Scratch cards generated but couldn't send SMS notification",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { sendScratchCardSMS };
};
