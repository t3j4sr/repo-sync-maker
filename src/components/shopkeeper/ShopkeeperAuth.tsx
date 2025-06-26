
import React, { useState } from 'react';
import { EmailLogin } from './EmailLogin';
import { EmailVerification } from './EmailVerification';

export const ShopkeeperAuth = () => {
  const [step, setStep] = useState<'login' | 'verification'>('login');
  const [email, setEmail] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleVerificationSent = (userEmail: string, signUp: boolean) => {
    setEmail(userEmail);
    setIsSignUp(signUp);
    setStep('verification');
  };

  const handleBack = () => {
    setStep('login');
    setEmail('');
    setIsSignUp(false);
  };

  const handleSuccess = () => {
    // This will trigger the auth state change in the main app
    console.log('Authentication successful');
  };

  if (step === 'verification') {
    return (
      <EmailVerification
        email={email}
        isSignUp={isSignUp}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <EmailLogin onVerificationSent={handleVerificationSent} />
  );
};
