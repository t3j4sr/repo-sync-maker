
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CustomerLogin from '@/components/CustomerLogin';
import ScratchCardGame from '@/components/ScratchCardGame';

const ScratchPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {!isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Scratch & Win
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Enter your mobile number to claim your discount
            </p>
            <CustomerLogin onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        ) : (
          <ScratchCardGame />
        )}
      </div>
    </div>
  );
};

export default ScratchPage;
