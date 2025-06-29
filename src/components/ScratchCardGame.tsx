
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ScratchCard from '@/components/ScratchCard';
import { useCustomerScratchCards } from '@/hooks/useCustomerScratchCards';
import { toast } from 'sonner';
import { Sparkles, Gift } from 'lucide-react';

interface CustomerData {
  id: string;
  name: string;
  phone: string;
}

const ScratchCardGame = () => {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const { scratchCards, loading: cardsLoading, error, scratchCard, refetchCards, isCardExpired } = useCustomerScratchCards(customer?.phone || '');

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const storedCustomer = localStorage.getItem('customer');
      console.log('Stored customer data:', storedCustomer);
      
      if (!storedCustomer) {
        toast.error('Authentication required');
        return;
      }

      const customerData = JSON.parse(storedCustomer);
      console.log('Parsed customer data:', customerData);
      setCustomer(customerData);
    } catch (err) {
      console.error('Error loading customer data:', err);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleCardReveal = async (cardId: string) => {
    if (!scratchCards) return;

    const card = scratchCards.scratch_cards.find(c => c.id === cardId);
    if (!card) {
      toast.error('Card not found');
      return;
    }

    if (card.is_scratched) {
      toast.error('This card has already been scratched');
      return;
    }

    const success = await scratchCard(cardId);
    if (success) {
      // Refetch cards to get updated data
      await refetchCards();
      // Navigate to a different card if available
      const availableCards = scratchCards.scratch_cards.filter(c => !c.is_scratched);
      if (availableCards.length > 1) {
        // Find next available card
        const nextIndex = availableCards.findIndex(c => c.id !== cardId);
        if (nextIndex !== -1) {
          setSelectedCardIndex(nextIndex);
        }
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('customer');
    window.location.reload();
  };

  const getDiscountDisplay = (card: any) => {
    if (card.discount_type === 'better_luck') {
      return 'Better Luck Next Time!';
    }
    return `₹${card.discount_value} OFF`;
  };

  // Add refresh functionality
  const handleRefresh = () => {
    if (refetchCards) {
      refetchCards();
    }
  };

  if (loading || cardsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading your scratch cards...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center text-white">
        <h2 className="text-2xl font-bold mb-4">No Customer Data</h2>
        <p className="text-gray-300 mb-6">
          Unable to load customer information. Please try again.
        </p>
        <Button onClick={logout} variant="outline">
          Try Different Number
        </Button>
      </div>
    );
  }

  console.log('Rendering with scratchCards:', scratchCards);
  console.log('Error state:', error);

  if (error || !scratchCards) {
    return (
      <div className="text-center text-white w-full max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Gift className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">Hey {customer.name}!</h1>
        </div>
        <Card className="p-6 bg-white/10 border-white/20 backdrop-blur-sm mb-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">
              {error ? 'Unable to Load Cards' : 'No Scratch Cards Available'}
            </h3>
            <p className="text-gray-300 mb-4">
              {error ? 'There was an issue loading your cards. Please try refreshing.' : 'You don\'t have any scratch cards yet. Make a purchase to earn your first scratch card!'}
            </p>
            {error && (
              <Button onClick={handleRefresh} className="mr-2 mb-2">
                Refresh Cards
              </Button>
            )}
          </div>
        </Card>
        <Button onClick={logout} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          Try Different Number
        </Button>
      </div>
    );
  }

  // Filter out expired scratched cards from the main game view
  const availableCards = scratchCards.scratch_cards.filter(card => 
    !card.is_scratched || (card.is_scratched && !isCardExpired(card))
  ).filter(card => !card.is_scratched);
  
  const currentCard = availableCards[selectedCardIndex];

  // Show all cards count for debugging
  console.log('Total cards:', scratchCards.scratch_cards.length);
  console.log('Available cards:', availableCards.length);

  if (scratchCards.scratch_cards.length === 0) {
    return (
      <div className="text-center text-white w-full max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Gift className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">Hey {customer.name}!</h1>
        </div>
        <Card className="p-6 bg-white/10 border-white/20 backdrop-blur-sm mb-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">No Scratch Cards Available</h3>
            <p className="text-gray-300 mb-4">
              You don't have any scratch cards yet. Make a purchase to earn your first scratch card!
            </p>
            <Button onClick={handleRefresh} className="mr-2">
              Check for New Cards
            </Button>
          </div>
        </Card>
        <Button onClick={logout} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          Try Different Number
        </Button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center text-white w-full max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Gift className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">Hey {customer.name}!</h1>
        </div>
        <Card className="p-6 bg-white/10 border-white/20 backdrop-blur-sm mb-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">All Cards Used or Expired</h3>
            <p className="text-gray-300 mb-4">
              You've scratched all your available cards or they have expired. Make another purchase to get more!
            </p>
            <div className="mt-4">
              <Button onClick={() => window.location.href = '/collection'} className="mr-2">
                View All Cards
              </Button>
              <Button onClick={handleRefresh}>
                Check for New Cards
              </Button>
            </div>
          </div>
        </Card>
        <Button onClick={logout} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          Try Different Number
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-white">Hey {customer.name}!</h1>
          <Sparkles className="w-8 h-8 text-yellow-400" />
        </div>
        <p className="text-gray-300 text-xl mb-2">Scratch here for your coupon</p>
        <p className="text-gray-400 text-sm">
          Available cards: {availableCards.length} | Total cards: {scratchCards.scratch_cards.length}
        </p>
      </motion.div>

      {/* Scratch Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 flex justify-center"
      >
        <ScratchCard
          onReveal={() => handleCardReveal(currentCard.id)}
          revealedCode={getDiscountDisplay(currentCard)}
          isRevealed={currentCard.is_scratched}
        />
      </motion.div>

      {/* Card Navigation */}
      {availableCards.length > 1 && (
        <div className="flex justify-center gap-2 mb-6">
          {availableCards.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedCardIndex(index)}
              className={`w-3 h-3 rounded-full ${
                index === selectedCardIndex ? 'bg-yellow-400' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="text-center space-y-2">
        <div>
          <Button 
            onClick={() => window.location.href = '/collection'} 
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold mr-2"
          >
            View All Cards
          </Button>
          <Button onClick={handleRefresh} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 mr-2">
            Refresh
          </Button>
        </div>
        <Button onClick={logout} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          Try Different Number
        </Button>
      </div>
    </div>
  );
};

export default ScratchCardGame;
