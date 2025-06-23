
import { useState, useEffect, createContext, useContext } from 'react'
import { User, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      setUser(session?.user ?? null)
      setLoading(false)
      
      // If user just signed up or signed in, ensure their profile exists
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setTimeout(async () => {
          // Only create profile for non-customers (shopkeepers)
          if (!session.user.user_metadata?.isCustomer) {
            await ensureProfileExists(session.user);
          }
        }, 1000);
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const ensureProfileExists = async (user: User) => {
    try {
      console.log('Ensuring profile exists for user:', user.id);
      console.log('User metadata:', user.user_metadata);
      
      // Check if profile exists
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking profile:', error);
        return;
      }

      if (!existingProfile) {
        // Profile doesn't exist, create it
        console.log('Creating profile for user:', user.id);
        const profileData = {
          id: user.id,
          phone: user.phone || user.user_metadata?.phone || '',
          shopkeeper_name: user.user_metadata?.shopkeeperName || user.user_metadata?.shopkeeper_name || 'Unknown User',
          shop_name: user.user_metadata?.shopName || user.user_metadata?.shop_name || 'Unknown Shop'
        };
        
        console.log('Profile data to insert:', profileData);
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Profile created successfully');
        }
      } else {
        console.log('Profile already exists');
        // Update profile with latest metadata if it exists but has placeholder values
        if (user.user_metadata?.shopkeeperName && user.user_metadata?.shopName) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              shopkeeper_name: user.user_metadata.shopkeeperName,
              shop_name: user.user_metadata.shopName,
              phone: user.phone || user.user_metadata?.phone || ''
            })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('Error updating profile:', updateError);
          } else {
            console.log('Profile updated with new metadata');
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

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
    console.log('Signing in with password for phone:', phone);
    
    const normalizedPhone = normalizePhone(phone);
    console.log('Normalized phone for password login:', normalizedPhone);
    
    try {
      // First verify shopkeeper credentials using the database function
      const { data: shopkeeperData, error: verifyError } = await supabase.rpc(
        'verify_shopkeeper_login',
        { 
          p_phone: normalizedPhone, 
          p_password: password 
        }
      );

      console.log('Shopkeeper verification result:', shopkeeperData, verifyError);

      if (verifyError || !shopkeeperData || shopkeeperData.length === 0) {
        console.log('Invalid credentials for shopkeeper');
        return { error: { message: 'Invalid phone number or password' } };
      }

      // Use email format with phone for auth (consistent approach)
      const email = `${normalizedPhone.replace('+', '')}@shopkeeper.app`;
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.log('Auth sign in failed, trying to create auth user');
        // If auth user doesn't exist, create one
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
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
          return { error: signUpError };
        }
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
    );

    if (!customerError && customerData && customerData.length > 0) {
      // This is a customer login
      console.log('Customer login detected:', customerData[0]);
      
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: 'sms'
      });

      if (!error) {
        // Update the user metadata to mark as customer
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            isCustomer: true,
            name: customerData[0].customer_name,
            customerId: customerData[0].customer_id
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
