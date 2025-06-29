
import { ScratchCard } from '@/types/scratchCard';

export const isCardExpired = (card: ScratchCard): boolean => {
  if (!card.is_scratched || !card.expires_at) return false;
  const now = new Date();
  const expiry = new Date(card.expires_at);
  console.log(`Card ${card.id} - Now: ${now.toISOString()}, Expires: ${expiry.toISOString()}, Expired: ${now > expiry}`);
  return now > expiry;
};

export const getTimeRemaining = (card: ScratchCard) => {
  if (!card.is_scratched || !card.expires_at) return null;
  
  const now = new Date().getTime();
  const expiry = new Date(card.expires_at).getTime();
  const timeLeft = expiry - now;
  
  console.log(`Card ${card.id} - Time left: ${timeLeft}ms (${Math.floor(timeLeft / 60000)} minutes)`);
  
  if (timeLeft <= 0) return { expired: true };
  
  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return { expired: false, minutes, seconds };
};

export const cleanScratchCard = (card: any): ScratchCard => ({
  id: card.id,
  discount_type: card.discount_type,
  discount_value: card.discount_value,
  created_at: card.created_at,
  scratched_at: card.scratched_at,
  expires_at: card.expires_at,
  is_scratched: card.is_scratched,
  shop_name: card.shop_name
});
