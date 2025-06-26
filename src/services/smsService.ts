
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export const useSMSService = () => {
  const { toast } = useToast();

  const sendWelcomeSMS = async (phone: string, name: string, cardsCount?: number, totalPurchase?: number, isWelcomeSMS?: boolean) => {
    try {
      console.log('Attempting to send welcome SMS to:', phone, 'for:', name);
      
      const { data, error } = await supabase.functions.invoke('send-welcome-sms', {
        body: {
          phone: phone,
          name: name,
          cardsCount: cardsCount,
          totalPurchase: totalPurchase,
          isWelcomeSMS: isWelcomeSMS
        }
      });

      if (error) {
        console.error('SMS error details:', error);
        throw error;
      }

      console.log('SMS response:', data);
      
      if (data?.error) {
        if (data?.code === 21608) {
          toast({
            title: "SMS Warning",
            description: "Customer added successfully! SMS not sent - phone number needs verification in Twilio trial account.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "SMS Warning",
            description: `Customer added successfully! SMS error: ${data.error}`,
            variant: "destructive",
          });
        }
        return data;
      }
      
      toast({
        title: "Welcome SMS Sent",
        description: `Welcome message sent to ${phone}`,
      });
      
      return data;
    } catch (error) {
      console.error('Failed to send welcome SMS:', error);
      toast({
        title: "SMS Error",
        description: "Customer added successfully but welcome SMS could not be sent. Please check your Twilio configuration.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendScratchCardSMS = async (
    phone: string, 
    customerName: string, 
    cardsCount: number, 
    totalPurchase: number,
    isWelcomeSMS: boolean = false
  ) => {
    try {
      console.log('Sending scratch card SMS:', { phone, customerName, cardsCount, totalPurchase, isWelcomeSMS });
      
      const { data, error } = await supabase.functions.invoke('send-scratch-card-sms', {
        body: {
          phone,
          customerName,
          cardsCount,
          totalPurchase,
          isWelcomeSMS
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
      
      const messageType = isWelcomeSMS ? "Welcome & Scratch Cards" : "Scratch Cards";
      toast({
        title: `${messageType} SMS Sent!`,
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

  return { sendWelcomeSMS, sendScratchCardSMS };
};
