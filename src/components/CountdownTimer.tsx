
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      console.log('Timer update:', {
        now: new Date(now).toISOString(),
        expiry: new Date(expiry).toISOString(),
        difference,
        differenceMinutes: Math.floor(difference / (1000 * 60))
      });

      if (difference <= 0) {
        setExpired(true);
        setTimeLeft(null);
        onExpire?.();
        return;
      }

      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({ minutes, seconds });
      setExpired(false);
    };

    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (expired) {
    return (
      <div className="flex items-center justify-center gap-1 text-red-400 text-sm">
        <Clock className="w-4 h-4" />
        <span>Expired</span>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="flex items-center justify-center gap-1 text-gray-400 text-sm">
        <Clock className="w-4 h-4" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 text-yellow-400 text-sm">
      <Clock className="w-4 h-4" />
      <span>
        {timeLeft.minutes}m {timeLeft.seconds}s left
      </span>
    </div>
  );
};

export default CountdownTimer;
