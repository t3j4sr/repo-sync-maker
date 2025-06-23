import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [shopkeeperName, setShopkeeperName] = useState("");
  const [shopName, setShopName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const { signUpWithPhone, verifyOtp } = useAuth();
  const { toast } = useToast();

  const formatPhoneNumber = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.length === 10) {
      return `+91${cleanNumber}`;
    }
    
    if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
      return `+${cleanNumber}`;
    }
    
    if (cleanNumber.startsWith('+')) {
      return cleanNumber;
    }
    
    return `+91${cleanNumber}`;
  };

  const normalizePhone = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.length === 10) {
      return `+91${cleanNumber}`;
    }
    
    if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
      return `+${cleanNumber}`;
    }
    
    if (cleanNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    return `+91${cleanNumber}`;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast({
        title: "Error",
        description: "Please enter both phone number and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      console.log('Attempting password login for:', normalizedPhone);
      
      // Verify shopkeeper credentials
      const { data: shopkeeperData, error: verifyError } = await supabase.rpc(
        'verify_shopkeeper_login',
        { 
          p_phone: normalizedPhone, 
          p_password: password 
        }
      );

      if (verifyError || !shopkeeperData || shopkeeperData.length === 0) {
        toast({
          title: "Error",
          description: "Invalid phone number or password",
          variant: "destructive",
        });
        return;
      }

      // Sign in the user with Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${normalizedPhone.replace('+', '')}@placeholder.com`,
        password: password,
      });

      if (signInError) {
        // If auth user doesn't exist, create one and set password
        const { error: signUpError } = await supabase.auth.signUp({
          email: `${normalizedPhone.replace('+', '')}@placeholder.com`,
          password: password,
          options: {
            data: {
              shopkeeperName: shopkeeperData[0].shopkeeper_name,
              shopName: shopkeeperData[0].shop_name,
              phone: normalizedPhone
            }
          }
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          toast({
            title: "Error",
            description: "Failed to authenticate",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: "Successfully logged in!",
      });
    } catch (error) {
      console.error('Password login error:', error);
      toast({
        title: "Error",
        description: "Failed to log in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && (!shopkeeperName.trim() || !shopName.trim() || !password.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      console.log('Sending OTP to:', formattedPhone);
      
      if (!isLogin) {
        // For signup, send OTP
        const metadata = {
          shopkeeperName: shopkeeperName.trim(),
          shopName: shopName.trim(),
          password: password.trim()
        };
        
        const result = await signUpWithPhone(formattedPhone, metadata);
        if (result.error) {
          console.error('OTP send error:', result.error);
          toast({
            title: "Error",
            description: result.error.message || "Failed to send OTP",
            variant: "destructive",
          });
          return;
        }
      } else {
        // For forgot password, send OTP
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });

        if (error) {
          console.error('OTP send error:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to send OTP",
            variant: "destructive",
          });
          return;
        }
      }

      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formattedPhone}`,
      });
    } catch (error) {
      console.error('OTP send error:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !otp) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive",
      });
      return;
    }

    if (otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      console.log('Verifying OTP for:', formattedPhone, 'OTP:', otp);
      
      if (!isLogin) {
        // For signup, verify OTP and create account
        const { error } = await verifyOtp(formattedPhone, otp);

        if (error) {
          console.error('OTP verification error:', error);
          toast({
            title: "Error",
            description: error.message || "Invalid OTP. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Set the password for the new shopkeeper
        const { error: passwordError } = await supabase.rpc(
          'set_shopkeeper_password',
          { 
            p_phone: formattedPhone, 
            p_password: password 
          }
        );

        if (passwordError) {
          console.error('Password set error:', passwordError);
        }

        // Send registration SMS
        try {
          await supabase.functions.invoke('send-registration-sms', {
            body: {
              phone: formattedPhone,
              shopkeeperName: shopkeeperName.trim()
            }
          });
        } catch (smsError) {
          console.error('Failed to send registration SMS:', smsError);
        }

        toast({
          title: "Success",
          description: "Registration complete! Welcome to Lucky Draw!",
        });
      } else {
        // For forgot password, verify OTP and allow password reset
        const { error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'sms'
        });

        if (error) {
          console.error('OTP verification error:', error);
          toast({
            title: "Error",
            description: error.message || "Invalid OTP. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Reset to login form to enter new password
        setShowForgotPassword(false);
        setOtpSent(false);
        setOtp("");
        toast({
          title: "OTP Verified",
          description: "Please enter your new password to complete the reset.",
        });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp("");
    setOtpSent(false);
    await handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleSignupRedirect = () => {
    setShowSignupPrompt(false);
    setIsLogin(false);
  };

  const resetForm = () => {
    setPhone("");
    setPassword("");
    setShopkeeperName("");
    setShopName("");
    setOtp("");
    setOtpSent(false);
    setShowSignupPrompt(false);
    setShowForgotPassword(false);
  };

  if (showSignupPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">
            Account Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            No account found for this phone number. Please sign up first to create your account.
          </p>
          <div className="space-y-3">
            <Button
              onClick={handleSignupRedirect}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Create Account
            </Button>
            <Button
              onClick={resetForm}
              variant="outline"
              className="w-full"
            >
              Try Different Number
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (otpSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Verify Phone
          </h1>
          <p className="text-gray-600 text-center mb-2">
            Enter the 6-digit code sent to
          </p>
          <p className="text-gray-800 font-medium text-center mb-8">
            {formatPhoneNumber(phone)}
          </p>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-center block">Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
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
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-purple-600 hover:text-purple-700 font-medium"
                disabled={loading}
              >
                Resend Code
              </button>
              <br />
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Change Phone Number
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Lucky Draw
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {isLogin && !showForgotPassword ? "Welcome back" : 
           showForgotPassword ? "Reset your password" : "Join the Lucky Draw"}
        </p>

        <form onSubmit={showForgotPassword ? handleSendOtp : (isLogin ? handlePasswordLogin : handleSendOtp)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              required
            />
            <p className="text-xs text-gray-500">
              Enter 10-digit mobile number (e.g., 9972447884)
            </p>
          </div>

          {isLogin && !showForgotPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          )}

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopkeeperName">Shopkeeper Name *</Label>
                <Input
                  id="shopkeeperName"
                  type="text"
                  value={shopkeeperName}
                  onChange={(e) => setShopkeeperName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name *</Label>
                <Input
                  id="shopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Enter your shop name"
                  required
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={loading}
          >
            {loading ? "Processing..." : 
             showForgotPassword ? "Send Reset Code" :
             isLogin ? "Login" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {isLogin && !showForgotPassword && (
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-purple-600 hover:text-purple-700 font-medium block w-full"
            >
              Forgot Password?
            </button>
          )}
          
          {showForgotPassword && (
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="text-gray-500 hover:text-gray-700 block w-full"
            >
              Back to Login
            </button>
          )}
          
          {!showForgotPassword && (
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword("");
                setShopkeeperName("");
                setShopName("");
              }}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              {isLogin ? "New user? Create account" : "Already have account? Sign in"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
