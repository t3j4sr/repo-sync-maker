
export const drawStarPattern = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Create golden gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#FFD700');
  gradient.addColorStop(0.5, '#FFA500');
  gradient.addColorStop(1, '#FF8C00');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw star pattern
  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
  const patternSize = 40;
  
  for (let x = 0; x < width + patternSize; x += patternSize) {
    for (let y = 0; y < height + patternSize; y += patternSize) {
      // Draw star
      drawStar(ctx, x + patternSize/2, y + patternSize/2, 8, 12, 6);
      
      // Draw hearts offset
      drawHeart(ctx, x + 20, y + 20, 6);
      
      // Draw lightning bolts
      drawLightning(ctx, x + 10, y + 30, 8);
    }
  }
};

export const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, innerRadius: number, outerRadius: number, points: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  
  // Heart shape using bezier curves
  ctx.moveTo(0, size);
  ctx.bezierCurveTo(-size, 0, -size, -size/2, -size/2, -size/2);
  ctx.bezierCurveTo(0, -size, 0, -size, 0, -size/2);
  ctx.bezierCurveTo(0, -size, 0, -size, size/2, -size/2);
  ctx.bezierCurveTo(size, -size/2, size, 0, 0, size);
  
  ctx.fill();
  ctx.restore();
};

export const drawLightning = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  
  // Lightning bolt shape
  ctx.moveTo(-size/4, -size);
  ctx.lineTo(size/4, -size/3);
  ctx.lineTo(-size/6, -size/3);
  ctx.lineTo(size/4, size);
  ctx.lineTo(-size/4, size/3);
  ctx.lineTo(size/6, size/3);
  ctx.closePath();
  
  ctx.fill();
  ctx.restore();
};

export const addTextureOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 1,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
};
