
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { drawStarPattern, addTextureOverlay } from '@/utils/scratchPatternUtils';

interface ScratchCanvasProps {
  onScratchProgress: (percentage: number) => void;
  isCompletelyRevealed: boolean;
}

const ScratchCanvas: React.FC<ScratchCanvasProps> = ({ onScratchProgress, isCompletelyRevealed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 320;
    canvas.height = 192;

    // Draw the silver scratch surface
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add scratchy texture
    ctx.fillStyle = '#A8A8A8';
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Add text overlay
    ctx.fillStyle = '#808080';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('FOR YOUR COUPON', canvas.width / 2, canvas.height / 2 + 10);
  }, []);

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (x - rect.left) * scaleX;
    const canvasY = (y - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 25, 0, Math.PI * 2);
    ctx.fill();

    // Calculate scratch percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    const percentage = (transparentPixels / (canvas.width * canvas.height)) * 100;
    console.log('Scratch percentage:', percentage);
    onScratchProgress(percentage);
  }, [onScratchProgress]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isCompletelyRevealed) return;
    
    setIsScratching(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    scratch(clientX, clientY);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isCompletelyRevealed || !isScratching) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    scratch(clientX, clientY);
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(false);
  };

  if (isCompletelyRevealed) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 cursor-pointer touch-none w-full h-full select-none"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      style={{ 
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    />
  );
};

export default ScratchCanvas;
