import React from 'react';
import { HandTrackingResult } from '../types';
import { Hand, Crosshair, MousePointer2, MoveDiagonal } from 'lucide-react';

interface ControlPadProps {
  result: HandTrackingResult;
  isConnected: boolean;
}

const ControlPad: React.FC<ControlPadProps> = ({ result, isConnected }) => {
  const xPercent = Math.round(result.x * 100);
  const yPercent = Math.round(result.y * 100);

  const getModeColor = () => {
    switch (result.gesture) {
        case 'POINTING': return 'text-yellow-400';
        default: return 'text-fuchsia-400';
    }
  };

  const getModeName = () => {
      switch (result.gesture) {
          case 'POINTING': return 'Single Point';
          default: return 'General / Scale';
      }
  };

  const getBarColor = () => {
    switch (result.gesture) {
        case 'POINTING': return 'bg-yellow-500';
        default: return 'bg-fuchsia-500';
    }
  };

  // Calculate spread percentage for visualization (New range: 0.35 to 1.0)
  // Range delta = 0.65
  const spreadPercent = result.handSpread 
    ? Math.max(0, Math.min(100, ((result.handSpread - 0.35) / 0.65) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-4 bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-gray-400 text-sm uppercase tracking-wider font-semibold">
          Tracking Data
        </h3>
        {isConnected && (
            <span className="text-xs font-mono text-green-500 bg-green-900/30 px-2 py-1 rounded">
                LIVE
            </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Coordinate Display */}
        <div className="col-span-2 bg-black/40 rounded-xl p-4 border border-gray-700 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-300 ${getBarColor()}`}></div>
            <div className="flex items-center gap-3 mb-2">
                <Crosshair className={`${getModeColor()}`} size={20} />
                <span className="text-gray-300 font-bold">
                  {getModeName()}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-2xl">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">X-AXIS</span>
                    <span className="text-white">{result.isDetected ? xPercent : '--'}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Y-AXIS</span>
                    <span className="text-white">{result.isDetected ? yPercent : '--'}%</span>
                </div>
            </div>
        </div>

        {/* Gesture Status */}
        <div className={`bg-black/40 rounded-xl p-4 border transition-all duration-300 flex flex-col items-center justify-center gap-2 ${result.gesture === 'POINTING' ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-gray-700'}`}>
             <MousePointer2 className={result.gesture === 'POINTING' ? 'text-yellow-400' : 'text-gray-600'} />
             <span className="text-xs text-gray-400">POINT</span>
        </div>

        <div className={`bg-black/40 rounded-xl p-4 border transition-all duration-300 flex flex-col items-center justify-center gap-2 ${result.gesture === 'GENERAL' ? 'border-fuchsia-500/50 bg-fuchsia-900/10' : 'border-gray-700'}`}>
             <MoveDiagonal className={result.gesture === 'GENERAL' ? 'text-fuchsia-400' : 'text-gray-600'} />
             <span className="text-xs text-gray-400">FREE MOVE</span>
        </div>

        <div className={`col-span-2 bg-black/40 rounded-xl p-4 border transition-all duration-300 flex flex-row items-center justify-center gap-4 ${result.gesture === 'GENERAL' ? 'border-cyan-500/50 bg-cyan-900/10' : 'border-gray-700'}`}>
             <Hand className={result.gesture === 'GENERAL' ? 'text-cyan-400' : 'text-gray-600'} />
             <div className="flex flex-col w-full">
                 <div className="flex justify-between">
                     <span className={`text-sm font-bold ${result.gesture === 'GENERAL' ? 'text-white' : 'text-gray-500'}`}>HAND SPREAD / SIZE</span>
                     <span className="text-xs font-mono text-gray-500">{Math.round(spreadPercent)}%</span>
                 </div>
                 
                 <div className="w-full h-2 bg-gray-800 mt-2 rounded-full overflow-hidden flex">
                     {/* Gradient bar from red (small/fist) to purple (large/open) */}
                     <div 
                        className="h-full transition-all duration-75" 
                        style={{ 
                            width: `${result.gesture === 'GENERAL' ? spreadPercent : 0}%`,
                            background: 'linear-gradient(90deg, #f59e0b, #06b6d4, #d946ef)' 
                        }}
                     ></div>
                 </div>
             </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 font-mono text-center">
        {result.isDetected 
            ? `Target: [${result.x.toFixed(2)}, ${result.y.toFixed(2)}]` 
            : 'Waiting for hand input...'}
      </div>
    </div>
  );
};

export default ControlPad;