import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoFeed, { VideoFeedHandle } from './components/VideoFeed';
import ControlPad from './components/ControlPad';
import ChristmasTree from './components/ChristmasTree'; 
import GestureGuide from './components/GestureGuide'; // Import Gesture Guide
import { LocalGestureService } from './services/liveApiService'; 
import { HandTrackingResult } from './types';
import { AlertCircle, Camera, Loader2, StopCircle, Zap, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // New state for coordinate tracking
  const [trackingResult, setTrackingResult] = useState<HandTrackingResult>({
    x: 0.5, y: 0.5, isDetected: false, gesture: 'NONE'
  });
  
  const [error, setError] = useState<string | null>(null);
  
  const videoFeedRef = useRef<VideoFeedHandle>(null);
  const animationFrameRef = useRef<number>(0);
  const gestureService = useRef<LocalGestureService>(new LocalGestureService());

  const startProcessing = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await gestureService.current.initialize();
      
      setIsLoading(false);
      setIsStreaming(true);
      
      const loop = () => {
        if (videoFeedRef.current?.videoElement) {
          const video = videoFeedRef.current.videoElement;
          const canvas = showSkeletonRef.current && videoFeedRef.current.canvasElement 
            ? videoFeedRef.current.canvasElement 
            : undefined;

          // Robust check for video readiness
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
             const result = gestureService.current.processVideoFrame(video, canvas);
             setTrackingResult(result);
          }
        }
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      
      loop();
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize AI model. Try refreshing or checking camera permissions.");
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const stopProcessing = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsStreaming(false);
    setTrackingResult({ x: 0.5, y: 0.5, isDetected: false, gesture: 'NONE' });
  };

  const handleToggle = () => {
    if (isStreaming) {
      stopProcessing();
    } else {
      startProcessing();
    }
  };

  // Ref pattern for closure in animation loop
  const showSkeletonRef = useRef(showSkeleton);
  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);

  useEffect(() => {
    if (!isStreaming) return;
    const loop = () => {
        if (videoFeedRef.current?.videoElement) {
          const video = videoFeedRef.current.videoElement;
          const canvas = showSkeletonRef.current && videoFeedRef.current.canvasElement 
            ? videoFeedRef.current.canvasElement 
            : undefined;

          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
             const result = gestureService.current.processVideoFrame(video, canvas);
             setTrackingResult(result);
          }
        }
        animationFrameRef.current = requestAnimationFrame(loop);
    };
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    loop();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); }
  }, [isStreaming]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleStreamReady = useCallback(() => {
    // Stream ready signal
  }, []);

  const handleToggleSkeleton = useCallback(() => {
    setShowSkeleton(prev => !prev);
  }, []);

  const handleCameraError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex flex-col items-center overflow-x-hidden">
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-400 to-red-600 bg-clip-text text-transparent flex items-center justify-center md:justify-start gap-3">
            Magic Christmas <span className="text-xs bg-zinc-800 text-white px-2 py-1 rounded border border-zinc-700">3D</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto md:mx-0">
             Gestures: <span className="text-amber-400">Open🖐️/Close✊</span> to Switch/Zoom. <span className="text-amber-400">Point☝️</span> to Rotate.
          </p>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all shadow-lg transform active:scale-95 ${
            isLoading 
             ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
             : isStreaming 
                ? 'bg-red-500/20 text-red-400 border border-red-500 hover:bg-red-500/30' 
                : 'bg-green-500 text-black hover:bg-green-400'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Starting...
            </>
          ) : isStreaming ? (
            <>
              <StopCircle size={20} /> Stop
            </>
          ) : (
            <>
              <Zap size={20} /> Start Magic
            </>
          )}
        </button>
      </header>

      {error && (
        <div className="w-full max-w-2xl mb-6 bg-red-900/30 border border-red-700 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-pulse">
          <AlertCircle className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Grid Layout - Mobile: Tree on Top (Order 1), Controls Bottom (Order 2) */}
      <main className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-12 gap-8 mb-10">
        
        {/* 3D Stage Area */}
        {/* On Mobile: Order 1 (Top). On Desktop: Left side. */}
        <div className="order-1 lg:col-span-8 h-[500px] lg:h-[650px] w-full relative z-10">
          <ChristmasTree trackingResult={trackingResult} />
        </div>

        {/* Sidebar / Controls Area */}
        {/* On Mobile: Order 2 (Bottom). On Desktop: Right side. */}
        <div className="order-2 lg:col-span-4 flex flex-col gap-6 relative z-0">
          
          {/* Camera Feed */}
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
             <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-300 uppercase tracking-wider">
               <Camera size={16} className="text-amber-500"/> Vision Feed
             </h2>
             <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
               <VideoFeed 
                  ref={videoFeedRef} 
                  showSkeleton={showSkeleton}
                  onToggleSkeleton={handleToggleSkeleton}
                  onStreamReady={handleStreamReady} 
                  onError={handleCameraError}
               />
             </div>
          </div>
          
          {/* Tracking Stats */}
          <div className="flex-1">
             <ControlPad result={trackingResult} isConnected={isStreaming} />
          </div>

          {/* Spell Book / Guide */}
          <div className="mt-auto">
             <GestureGuide />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;