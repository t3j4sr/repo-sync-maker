
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  isSignUp: boolean;
  onBack: () => void;
  onSuccess: () => void;
}

export const EmailVerification = ({ email, isSignUp, onBack, onSuccess }: EmailVerificationProps) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });

      if (error) {
        console.error('OTP verification error:', error);
        toast.error(error.message || 'Invalid verification code');
        return;
      }

      if (data.user) {
        console.log('User verified successfully:', data.user);
        
        // If this is a sign up, create shopkeeper profile
        if (isSignUp) {
          const userData = data.user.user_metadata;
          
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              shopkeeper_name: userData.full_name || 'Shopkeeper',
              shop_name: userData.shop_name || 'Shop',
              phone: userData.phone || ''
            }]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
            toast.error('Failed to create profile. Please try again.');
            return;
          }
        }

        toast.success(isSignUp ? 'Account created successfully!' : 'Logged in successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email
      });

      if (error) {
        console.error('Resend error:', error);
        toast.error('Failed to resend verification code');
        return;
      }

      toast.success('Verification code sent again!');
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a 6-digit verification code to<br />
            <span className="font-medium">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl font-mono tracking-wider"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Didn't receive the code?
            </p>
            <Button
              type="button"
              variant="link"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="text-sm"
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
