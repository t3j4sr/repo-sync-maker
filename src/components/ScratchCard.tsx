
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ScratchCardContent from './ScratchCardContent';
import ScratchCanvas from './ScratchCanvas';

interface ScratchCardProps {
  onReveal?: (code: string) => void;
  isRevealed?: boolean;
  revealedCode?: string;
  className?: string;
}

const ScratchCard: React.FC<ScratchCardProps> = ({ 
  onReveal, 
  isRevealed = false, 
  revealedCode = '',
  className = "" 
}) => {
  const [generatedCode, setGeneratedCode] = useState<string>(revealedCode);
  const [isCompletelyRevealed, setIsCompletelyRevealed] = useState(isRevealed);

  const handleScratchProgress = useCallback((percentage: number) => {
    console.log('Scratch progress:', percentage);
    if (percentage > 40 && !isCompletelyRevealed) {
      const code = revealedCode;
      setGeneratedCode(code);
      setIsCompletelyRevealed(true);
      onReveal?.(code);
    }
  }, [isCompletelyRevealed, onReveal, revealedCode]);

  if (isRevealed) {
    return (
      <motion.div 
        className={`relative rounded-2xl overflow-hidden shadow-2xl ${className}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative w-80 h-48 bg-white rounded-2xl overflow-hidden border-4 border-gray-800">
          <ScratchCardContent generatedCode={revealedCode} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`relative rounded-2xl overflow-hidden shadow-2xl ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-80 h-48 bg-white rounded-2xl overflow-hidden border-4 border-gray-800">
        {/* Hidden content - revealed code with black and white theme */}
        <ScratchCardContent generatedCode={generatedCode} />
        
        {/* Scratch surface */}
        {!isCompletelyRevealed && (
          <ScratchCanvas 
            onScratchProgress={handleScratchProgress}
            isCompletelyRevealed={isCompletelyRevealed}
          />
        )}
      </div>
    </motion.div>
  );
};

export default ScratchCard;
