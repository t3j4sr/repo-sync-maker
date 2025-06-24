
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Gift, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScratchCardProps {
  reward: string;
  onRewardRevealed: (reward: string) => void;
  onSendSMS: (phone: string, reward: string) => Promise<void>;
}

export const ScratchCard = ({ reward, onRewardRevealed, onSendSMS }: ScratchCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const { toast } = useToast();

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 300;
    canvas.height = 200;

    // Create silver scratch layer
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#e5e7eb');
    gradient.addColorStop(0.5, '#9ca3af');
    gradient.addColorStop(1, '#6b7280');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add scratch instruction text
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.fillText('Scratch to reveal', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('your reward!', canvas.width / 2, canvas.height / 2 + 15);
  }, []);

  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.fill();

    // Calculate scratch percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    const percentage = (transparent / (pixels.length / 4)) * 100;
    setScratchPercentage(percentage);

    if (percentage > 50 && !isRevealed) {
      setIsRevealed(true);
      onRewardRevealed(reward);
      toast({
        title: "🎉 Reward Revealed!",
        description: "You've uncovered your reward!",
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    const pos = getEventPos(e);
    scratch(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScratching) return;
    const pos = getEventPos(e);
    scratch(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(true);
    const pos = getEventPos(e);
    scratch(pos.x, pos.y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isScratching) return;
    const pos = getEventPos(e);
    scratch(pos.x, pos.y);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(false);
  };

  const handleSendSMS = async () => {
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    if (!isRevealed) {
      toast({
        title: "Error",
        description: "Please scratch the card first to reveal your reward",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await onSendSMS(phone, reward);
      toast({
        title: "Success!",
        description: "Reward sent to your phone number via SMS",
      });
      setPhone('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <Card className="overflow-hidden shadow-lg">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-8">
            <div className="text-center text-white mb-4">
              <Gift className="w-8 h-8 mx-auto mb-2" />
              <h3 className="text-lg font-bold">Lucky Scratch Card</h3>
            </div>
            
            <div className="relative mx-auto" style={{ width: '300px', height: '200px' }}>
              {/* Reward background */}
              <div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center p-4 shadow-inner">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-2">🎉</div>
                  <div className="text-lg font-semibold text-gray-800">{reward}</div>
                </div>
              </div>
              
              {/* Scratch canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 rounded-lg cursor-pointer select-none touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
              />
            </div>

            {isRevealed && (
              <div className="mt-4 text-center">
                <div className="text-white text-sm font-medium">
                  {Math.round(scratchPercentage)}% revealed
                </div>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your phone number to receive reward via SMS
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Button
              onClick={handleSendSMS}
              disabled={!isRevealed || isSending}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reward via SMS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
