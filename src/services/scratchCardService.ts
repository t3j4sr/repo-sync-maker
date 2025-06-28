
import { useScratchCards } from "@/hooks/useScratchCards";
import { useScratchCardSMS } from "@/hooks/useScratchCardSMS";

export const useScratchCardService = () => {
  const { generateScratchCards } = useScratchCards();
  const { sendScratchCardSMS } = useScratchCardSMS();

  const handleScratchCardsForPurchase = async (
    customerId: string,
    customerName: string,
    customerPhone: string,
    purchaseAmount: number
  ) => {
    try {
      const newCardsCount = await generateScratchCards(customerId);
      console.log('Generated cards for purchase:', newCardsCount);
      
      if (newCardsCount > 0) {
        // Send SMS with scratch card link
        try {
          await sendScratchCardSMS(
            customerPhone,
            customerName,
            newCardsCount,
            purchaseAmount
          );
          return { success: true, cardsGenerated: newCardsCount };
        } catch (smsError) {
          console.error('Scratch card SMS error (non-blocking):', smsError);
          return { success: true, cardsGenerated: newCardsCount, smsError: true };
        }
      }
      
      return { success: true, cardsGenerated: 0 };
    } catch (error) {
      console.error('Error handling scratch cards:', error);
      return { success: false, cardsGenerated: 0, error };
    }
  };

  return { handleScratchCardsForPurchase };
};
