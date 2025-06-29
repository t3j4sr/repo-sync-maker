
import React from 'react';

interface ScratchCardContentProps {
  generatedCode: string;
}

const ScratchCardContent: React.FC<ScratchCardContentProps> = ({ generatedCode }) => {
  const isBetterLuck = generatedCode.includes('Better Luck');
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-white">
      {/* Main content */}
      <div className="text-center">
        {/* Congratulations text or Better Luck */}
        <div className="mb-3">
          {isBetterLuck ? (
            <div className="text-black text-xl font-bold">🍀 BETTER LUCK NEXT TIME! 🍀</div>
          ) : (
            <div className="text-black text-2xl font-bold">🎉 YOU WON! 🎉</div>
          )}
        </div>
        
        {/* Discount value */}
        <div className="mb-3">
          <div className={`text-black font-bold ${isBetterLuck ? 'text-2xl' : 'text-5xl'} border-4 border-black px-6 py-3 bg-white shadow-lg rounded-lg`}>
            {isBetterLuck ? '😔' : (generatedCode || '???')}
          </div>
        </div>
        
        {/* Discount label or message */}
        <div className="mb-2">
          {isBetterLuck ? (
            <div className="text-black text-lg font-bold">
              Keep Shopping for More Chances!
            </div>
          ) : (
            <div className="text-black text-xl font-bold uppercase tracking-wider border-b-2 border-black pb-1">
              DISCOUNT
            </div>
          )}
        </div>
        
        {/* Store name */}
        <div className="mb-2">
          <div className="text-gray-800 text-sm font-semibold uppercase tracking-wide">
            Sri Krishna Groceries
          </div>
        </div>
        
        {/* Valid text */}
        <div>
          {isBetterLuck ? (
            <div className="text-gray-600 text-xs font-medium">
              Try again with your next purchase!
            </div>
          ) : (
            <div className="text-gray-600 text-xs font-medium">
              Show this to claim your discount!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScratchCardContent;
