import React, { useEffect, useRef } from 'react';
import { HandTrackingResult } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, OBJECT_SIZE } from '../constants';

interface GameCanvasProps {
  trackingResult: HandTrackingResult;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ trackingResult }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Internal state for smooth animation
  const positionRef = useRef<{x: number, y: number}>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  
  // Ref for smooth size transition
  const sizeRef = useRef<number>(OBJECT_SIZE);
  
  // Trail history
  const trailRef = useRef<Array<{x: number, y: number, alpha: number, size: number}>>([]);
  
  const requestRef = useRef<number>(0);

  // Animation Loop
  const animate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      // 1. Clear Canvas with slight fade for motion blur effect
      ctx.fillStyle = 'rgba(9, 9, 11, 0.3)'; 
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Calculate Target Position & Size
      let targetX = positionRef.current.x;
      let targetY = positionRef.current.y;
      
      let targetSize = sizeRef.current; 

      if (trackingResult.isDetected) {
        // Position Logic
        const padding = sizeRef.current; 
        targetX = trackingResult.x * CANVAS_WIDTH;
        targetY = trackingResult.y * CANVAS_HEIGHT;
        
        targetX = Math.max(padding, Math.min(CANVAS_WIDTH - padding, targetX));
        targetY = Math.max(padding, Math.min(CANVAS_HEIGHT - padding, targetY));

        // --- Continuous Size Logic ---
        if (trackingResult.gesture === 'POINTING') {
            // Locking size when pointing for precision
            targetSize = 40; 
        } else if (trackingResult.handSpread !== undefined) {
            // Map Spread to Size
            // Adjusted parameters for better sensitivity based on user feedback
            // Old Range: 0.5 (Fist) -> 1.6 (Max)
            // New Range: 0.35 (Fist) -> 1.0 (Max - easier to reach)
            
            const minSpread = 0.35;
            const maxSpread = 1.0;
            
            // Normalize
            let t = (trackingResult.handSpread - minSpread) / (maxSpread - minSpread);
            t = Math.max(0, Math.min(1, t)); // Clamp 0 to 1
            
            // Linear Interpolation
            const minSize = 15;
            const maxSize = 140;
            targetSize = minSize + t * (maxSize - minSize);
        }
      }

      // 3. Smooth Movement (Lerp)
      const lerpFactor = 0.15; // Position smoothness
      const sizeLerpFactor = 0.1; // Size smoothness (responsive but smooth)

      positionRef.current.x += (targetX - positionRef.current.x) * lerpFactor;
      positionRef.current.y += (targetY - positionRef.current.y) * lerpFactor;
      
      sizeRef.current += (targetSize - sizeRef.current) * sizeLerpFactor;

      // 4. Update Trail
      if (trackingResult.isDetected) {
          trailRef.current.push({ 
              x: positionRef.current.x, 
              y: positionRef.current.y, 
              alpha: 1.0,
              size: sizeRef.current 
          });
      }
      if (trailRef.current.length > 20) trailRef.current.shift();

      // 5. Draw Trail
      if (trailRef.current.length > 0) {
        trailRef.current.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(6, 182, 212, ${point.alpha * 0.2})`;
            ctx.fill();
            point.alpha -= 0.05;
        });
      }

      // 6. Draw Player/Cursor
      ctx.beginPath();
      ctx.arc(positionRef.current.x, positionRef.current.y, sizeRef.current, 0, Math.PI * 2);
      
      // Color changes based on gesture/size
      if (!trackingResult.isDetected) {
        ctx.fillStyle = '#52525b'; // Gray if lost
        ctx.shadowColor = 'transparent';
      } else if (trackingResult.gesture === 'POINTING') {
        ctx.fillStyle = '#facc15'; // Yellow
        ctx.shadowColor = '#facc15';
      } else {
        // Continuous color blending based on size
        // Small (Red/Amber) -> Medium (Blue) -> Large (Purple)
        
        // Normalize current size (15 to 140)
        const t = (sizeRef.current - 15) / (140 - 15);
        
        let r, g, b;
        
        if (t < 0.5) {
            // First half: Red/Amber (245, 158, 11) to Cyan (6, 182, 212)
            const localT = t * 2; 
            r = 245 + (6 - 245) * localT;
            g = 158 + (182 - 158) * localT;
            b = 11 + (212 - 11) * localT;
        } else {
            // Second half: Cyan (6, 182, 212) to Purple (217, 70, 239)
            const localT = (t - 0.5) * 2;
            r = 6 + (217 - 6) * localT;
            g = 182 + (70 - 182) * localT;
            b = 212 + (239 - 212) * localT;
        }

        const color = `rgb(${r}, ${g}, ${b})`;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
      }
      
      ctx.shadowBlur = sizeRef.current * 0.5;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 7. Draw connection line to edges
      if (trackingResult.isDetected) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(positionRef.current.x, 0);
        ctx.lineTo(positionRef.current.x, CANVAS_HEIGHT);
        ctx.moveTo(0, positionRef.current.y);
        ctx.lineTo(CANVAS_WIDTH, positionRef.current.y);
        ctx.stroke();
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [trackingResult]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-gray-950 shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(circle at 1px 1px, #333 1px, transparent 0)',
             backgroundSize: '40px 40px'
           }}
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain"
      />
      <div className="absolute top-4 right-4 bg-gray-900/80 px-4 py-2 rounded-full border border-gray-700 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${trackingResult.isDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-gray-400 text-sm">
            {trackingResult.isDetected ? 'Tracking Hand' : 'No Hand Detected'}
        </span>
      </div>
    </div>
  );
};

export default GameCanvas;