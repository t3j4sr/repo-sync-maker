
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ScratchCard from '@/components/ScratchCard';
import { useCustomerScratchCards } from '@/hooks/useCustomerScratchCards';
import { toast } from 'sonner';
import { Gift, AlertCircle, ArrowLeft } from 'lucide-react';

const ScratchCardPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [phone, setPhone] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  
  const { scratchCards, loading, error, scratchCard } = useCustomerScratchCards(phone);

  useEffect(() => {
    // Extract phone from URL or get from localStorage
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      const customer = JSON.parse(storedCustomer);
      setPhone(customer.phone);
    }
  }, []);

  useEffect(() => {
    if (id && scratchCards) {
      const card = scratchCards.scratch_cards.find(c => c.id === id);
      if (card) {
        setSelectedCard(card);
      }
    }
  }, [id, scratchCards]);

  const handleCardReveal = async (revealedCode: string) => {
    if (!selectedCard || selectedCard.is_scratched) return;

    const success = await scratchCard(selectedCard.id);
    if (success) {
      setSelectedCard(prev => ({ ...prev, is_scratched: true }));
    }
  };

  const getDiscountDisplay = (card: any) => {
    if (card.discount_type === 'better_luck') {
      return 'Better Luck Next Time!';
    }
    return `₹${card.discount_value} OFF`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading your scratch card...</div>
      </div>
    );
  }

  if (error || !scratchCards || !selectedCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800">
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <Card className="p-8 bg-white/10 border-white/20 backdrop-blur-sm text-center max-w-md">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Card Not Found</h1>
            <p className="text-white/80 mb-6">
              {error || 'The scratch card you\'re looking for doesn\'t exist.'}
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
            >
              Go to Home
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800">
      {/* Header */}
      <div className="pt-8 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <motion.h1 
            className="text-3xl font-bold text-white mb-2 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Welcome {scratchCards.customer_name}!
          </motion.h1>
          <p className="text-white/80 text-lg text-center">
            Your exclusive scratch card awaits
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Customer Info */}
          <Card className="mb-6 p-4 bg-white/10 border-white/20 backdrop-blur-sm">
            <div className="text-center text-white">
              <Gift className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
              <h2 className="font-semibold mb-1">Congratulations!</h2>
              <p className="text-sm text-white/80 mb-2">
                You've earned a scratch card from your recent purchase!
              </p>
            </div>
          </Card>

          {/* Scratch Card */}
          <div className="mb-6">
            {selectedCard.is_scratched ? (
              <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl p-8 text-center text-white shadow-2xl">
                <div className="mb-4">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto">
                    <div className="text-black text-4xl">🎁</div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2">🎉 You Won!</h3>
                <div className="text-4xl font-bold mb-2">{getDiscountDisplay(selectedCard)}</div>
                <div className="text-lg">Discount</div>
                <p className="text-sm mt-4 text-green-100">
                  Show this to the shopkeeper to claim your discount!
                </p>
              </div>
            ) : (
              <ScratchCard 
                onReveal={handleCardReveal}
                revealedCode={getDiscountDisplay(selectedCard)}
              />
            )}
          </div>

          {/* Instructions */}
          {!selectedCard.is_scratched && (
            <Card className="p-4 bg-white/10 border-white/20 backdrop-blur-sm">
              <div className="text-center text-white">
                <h3 className="font-semibold mb-2">How to Play</h3>
                <p className="text-sm text-white/80">
                  Scratch the silver area with your finger to reveal your discount!
                </p>
              </div>
            </Card>
          )}

          {/* Already Scratched Message */}
          {selectedCard.is_scratched && (
            <Card className="p-4 bg-green-500/20 border-green-400/30 backdrop-blur-sm">
              <div className="text-center text-white">
                <h3 className="font-semibold mb-2">Card Already Scratched</h3>
                <p className="text-sm text-green-100">
                  This card has been used. Make another purchase to get a new scratch card!
                </p>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ScratchCardPage;
