
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Loader2, Phone } from 'lucide-react';

interface CustomerLoginProps {
  onLoginSuccess: () => void;
}

const CustomerLogin: React.FC<CustomerLoginProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  
  const { 
    authenticateUser, 
    isLoading, 
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

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      return;
    }

    const result = await authenticateUser(phone);
    if (result.success) {
      onLoginSuccess();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Phone className="h-5 w-5" />
          Enter Mobile Number
        </CardTitle>
        <CardDescription>
          Enter your mobile number to access your scratch cards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAuthenticate} className="space-y-4">
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
                Checking...
              </>
            ) : (
              'Access Scratch Cards'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerLogin;
