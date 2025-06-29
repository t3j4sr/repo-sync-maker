
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Loader2, Phone, Shield, ArrowLeft } from 'lucide-react';

interface CustomerLoginProps {
  onLoginSuccess: () => void;
}

const CustomerLogin: React.FC<CustomerLoginProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  const { 
    sendOTP, 
    verifyOTP, 
    resendOTP,
    isLoading, 
    otpSent, 
    checkStoredAuth, 
    isAuthenticated 
  } = useCustomerAuth();

  useEffect(() => {
    checkStoredAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      return;
    }

    await sendOTP(phone);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      return;
    }

    const result = await verifyOTP(otp);
    if (result.success) {
      onLoginSuccess();
    }
  };

  const handleResendOTP = async () => {
    await resendOTP();
    setOtp('');
  };

  const goBack = () => {
    setOtp('');
    // Reset the OTP sent state by calling logout which resets all state
    const { logout } = useCustomerAuth();
    logout();
    window.location.reload();
  };

  if (otpSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Enter Verification Code
          </CardTitle>
          <CardDescription>
            We've sent a 6-digit code to your mobile number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Verification Code
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="w-full"
              >
                Resend Code
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={isLoading}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Phone Number
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Phone className="h-5 w-5" />
          Enter Mobile Number
        </CardTitle>
        <CardDescription>
          Enter your mobile number to receive a verification code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Mobile Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !phone}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerLogin;
