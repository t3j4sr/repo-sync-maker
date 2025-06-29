
import React from 'react';
import { motion } from 'framer-motion';
import ScratchCard from './ScratchCard';

interface ScratchCardData {
  id: string;
  code: string;
  timestamp: Date;
  isRevealed: boolean;
}

interface ScratchCardGridProps {
  cards: ScratchCardData[];
  onCardReveal?: (id: string, code: string) => void;
}

const ScratchCardGrid: React.FC<ScratchCardGridProps> = ({ cards, onCardReveal }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="relative"
        >
          <ScratchCard
            isRevealed={card.isRevealed}
            revealedCode={card.code}
            onReveal={(code) => onCardReveal?.(card.id, code)}
          />
          <div className="mt-2 text-center">
            <p className="text-sm text-muted-foreground">
              {card.timestamp.toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ScratchCardGrid;
