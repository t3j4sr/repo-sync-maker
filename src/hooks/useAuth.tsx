import { useState, useEffect, createContext, useContext } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithPhone: (phone: string) => Promise<{ error: any; isNewUser?: boolean }>
  signInWithPassword: (phone: string, password: string) => Promise<{ error: any }>
  signUpWithPhone: (phone: string, metadata?: { shopkeeperName: string; shopName: string; password?: string }) => Promise<{ error: any }>
  verifyOtp: (phone: string, otp: string) => Promise<{ error: any }>
  resetPassword: (phone: string, newPassword: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener with timeout
    const setupAuth = async () => {
      try {
        // First get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (mounted) {
          console.log('Initial session loaded:', session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }

        // Then set up the listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
          if (!mounted) return;
          
          console.log('Auth state change:', event, session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Handle Google OAuth sign up - create profile if needed
          if (event === 'SIGNED_IN' && session?.user && !session.user.user_metadata?.isCustomer) {
            try {
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

              if (!existingProfile) {
                const userData = session.user;
                const { error: profileError } = await supabase
                  .from('profiles')
                  .insert([{
                    id: userData.id,
                    shopkeeper_name: userData.user_metadata.full_name || userData.user_metadata.name || 'Shopkeeper',
                    shop_name: userData.user_metadata.shop_name || 'Shop',
                    phone: userData.phone || ''
                  }]);

                if (profileError) {
                  console.error('Failed to create profile:', profileError);
                } else {
                  console.log('Profile created for Google user');
                }
              }
            } catch (error) {
              console.error('Error handling Google OAuth profile:', error);
            }
          }
        });

        return () => {
          if (subscription) {
            subscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error('Auth setup error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const cleanup = setupAuth();

    return () => {
      mounted = false;
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [])

  const normalizePhone = (phone: string) => {
    // Remove all non-digit characters
    const cleanNumber = phone.replace(/\D/g, '');
    
    // Handle different input formats
    if (cleanNumber.length === 10) {
      return `+91${cleanNumber}`;
    }
    
    if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
      return `+${cleanNumber}`;
    }
    
    if (phone.startsWith('+') && cleanNumber.length === 12) {
      return `+${cleanNumber}`;
    }
    
    // Default fallback
    return `+91${cleanNumber}`;
  };

  const signInWithPhone = async (phone: string) => {
    console.log('Signing in with phone:', phone);
    
    const normalizedPhone = normalizePhone(phone);
    console.log('Normalized phone for OTP:', normalizedPhone);
    
    // For shopkeeper login, check if user exists in profiles table
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', profileError);
      return { error: profileError };
    }
    
    // If no shopkeeper profile exists, this is a new user who needs to sign up
    if (!existingProfile) {
      return { error: null, isNewUser: true };
    }
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    })
    return { error }
  }

  const signInWithPassword = async (phone: string, password: string) => {
    console.log('=== PASSWORD LOGIN DEBUG ===');
    console.log('Original phone input:', phone);
    console.log('Password provided:', password ? 'YES' : 'NO');
    
    const normalizedPhone = normalizePhone(phone);
    console.log('Normalized phone:', normalizedPhone);
    
    try {
      // Check if user exists with the normalized phone number
      console.log('Checking profile existence for:', normalizedPhone);
      
      const { data: shopkeeperData, error: verifyError } = await supabase.rpc(
        'verify_shopkeeper_login',
        { 
          p_phone: normalizedPhone, 
          p_password: password 
        }
      ) as { data: any[] | null, error: any };

      console.log('Shopkeeper verification result:', { shopkeeperData, verifyError });

      if (verifyError || !shopkeeperData || (Array.isArray(shopkeeperData) && shopkeeperData.length === 0)) {
        console.log('No shopkeeper found or invalid password');
        return { error: { message: 'Invalid phone number or password' } };
      }

      // Use consistent email format with phone for auth
      const email = `${normalizedPhone.replace('+', '')}@shopkeeper.app`;
      console.log('Trying auth with email:', email);
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.log('Auth user does not exist, creating one');
        // If auth user doesn't exist, create one with proper metadata
        const profileData = Array.isArray(shopkeeperData) ? shopkeeperData[0] : shopkeeperData;
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              shopkeeperName: (profileData as any)?.shopkeeper_name || 'Shopkeeper',
              shopName: (profileData as any)?.shop_name || 'Shop',
              phone: normalizedPhone
            }
          }
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          return { error: signUpError };
        }
        
        console.log('Auth user created successfully');
      } else {
        console.log('Auth login successful');
      }

      return { error: null };
    } catch (error) {
      console.error('Password sign in error:', error);
      return { error };
    }
  }

  const signUpWithPhone = async (phone: string, metadata?: { shopkeeperName: string; shopName: string; password?: string }) => {
    console.log('Signing up with phone:', phone, 'metadata:', metadata);
    
    const normalizedPhone = normalizePhone(phone);
    
    // Ensure we have required metadata for signup
    if (!metadata || !metadata.shopkeeperName || !metadata.shopName) {
      return { error: { message: 'Shopkeeper name and shop name are required for signup' } };
    }
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        data: {
          shopkeeperName: metadata.shopkeeperName,
          shopName: metadata.shopName,
          phone: normalizedPhone
        }
      }
    })
    return { error }
  }

  const verifyOtp = async (phone: string, token: string) => {
    console.log('Verifying OTP for phone:', phone, 'token:', token);
    
    const normalizedPhone = normalizePhone(phone);
    
    // First check if this is a customer trying to log in
    const { data: customerData, error: customerError } = await supabase.rpc(
      'verify_customer_login',
      { p_phone: normalizedPhone }
    ) as { data: any[] | null, error: any };

    if (!customerError && customerData && Array.isArray(customerData) && customerData.length > 0) {
      // This is a customer login
      console.log('Customer login detected:', customerData[0]);
      
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: 'sms'
      });

      if (!error) {
        // Update the user metadata to mark as customer
        const customer = customerData[0] as any;
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            isCustomer: true,
            name: customer.customer_name,
            customerId: customer.customer_id
          }
        });
        
        if (updateError) {
          console.error('Error updating user metadata:', updateError);
        } else {
          console.log('Customer metadata updated successfully');
        }
      }
      
      return { error };
    } else {
      // This is a shopkeeper login/signup
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: 'sms'
      });
      return { error };
    }
  }

  const resetPassword = async (phone: string, newPassword: string) => {
    console.log('Resetting password for phone:', phone);
    
    const normalizedPhone = normalizePhone(phone);
    
    try {
      // Update password in profiles table
      const { error: updateError } = await supabase.rpc(
        'update_shopkeeper_password',
        { 
          p_phone: normalizedPhone, 
          p_new_password: newPassword 
        }
      );

      if (updateError) {
        return { error: updateError };
      }

      // Update auth password too
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      return { error: authError };
    } catch (error) {
      return { error };
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      loading, 
      signInWithPhone,
      signInWithPassword,
      signUpWithPhone, 
      verifyOtp,
      resetPassword,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
