
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export const useSMSService = () => {
  const { toast } = useToast();

  const sendWelcomeSMS = async (phone: string, name: string) => {
    try {
      console.log('Attempting to send welcome SMS to:', phone, 'for:', name);
      
      const { data, error } = await supabase.functions.invoke('send-welcome-sms', {
        body: {
          phone: phone,
          name: name
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

  return { sendWelcomeSMS };
};
