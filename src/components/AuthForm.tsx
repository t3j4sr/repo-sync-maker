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
  const { signUpWithPhone, verifyOtp, signInWithPassword } = useAuth();
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google auth error:', error);
        toast({
          title: "Error",
          description: "Failed to authenticate with Google",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      console.log('Attempting password login for:', phone);
      
      const { error } = await signInWithPassword(phone, password);

      if (error) {
        console.error('Password login error:', error);
        toast({
          title: "Error",
          description: error.message || "Invalid phone number or password",
          variant: "destructive",
        });
        return;
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

        // CRITICAL: Create the profile immediately after OTP verification
        console.log('Creating profile with data:', {
          phone: formattedPhone,
          shopkeeperName: shopkeeperName.trim(),
          shopName: shopName.trim()
        });

        // Get the current user after verification
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Create profile in database
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              phone: formattedPhone,
              shopkeeper_name: shopkeeperName.trim(),
              shop_name: shopName.trim(),
              password_hash: null // Will be set below
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          } else {
            console.log('Profile created successfully');
          }

          // Set the password using the RPC function
          console.log('Setting password for new shopkeeper:', formattedPhone);
          const { error: passwordError } = await supabase.rpc(
            'set_shopkeeper_password',
            { 
              p_phone: formattedPhone, 
              p_password: password 
            }
          );

          if (passwordError) {
            console.error('Password set error:', passwordError);
            toast({
              title: "Warning",
              description: "Account created but password setup failed. Please contact support.",
              variant: "destructive",
            });
          } else {
            console.log('Password set successfully for:', formattedPhone);
          }
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
              onClick={() => {
                setShowSignupPrompt(false);
                setIsLogin(false);
              }}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Create Account
            </Button>
            <Button
              onClick={() => {
                setPhone("");
                setPassword("");
                setShopkeeperName("");
                setShopName("");
                setOtp("");
                setOtpSent(false);
                setShowSignupPrompt(false);
                setShowForgotPassword(false);
              }}
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
                onClick={async () => {
                  setOtp("");
                  setOtpSent(false);
                  await handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
                }}
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

        {/* Google Authentication Button */}
        <Button 
          type="button" 
          variant="outline" 
          className="w-full mb-4" 
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">
              Or continue with phone
            </span>
          </div>
        </div>

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
