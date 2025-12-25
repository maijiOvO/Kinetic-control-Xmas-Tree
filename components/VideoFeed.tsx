import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Eye, EyeOff, Camera, AlertCircle, Loader2 } from 'lucide-react';

interface VideoFeedProps {
  onStreamReady: (video: HTMLVideoElement) => void;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  onError: (msg: string) => void;
}

export interface VideoFeedHandle {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
}

const VideoFeed = forwardRef<VideoFeedHandle, VideoFeedProps>(({ onStreamReady, showSkeleton, onToggleSkeleton, onError }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  useImperativeHandle(ref, () => ({
    videoElement: videoRef.current,
    canvasElement: canvasRef.current
  }));

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isMounted = true;

    const getCameraStream = async () => {
      // 策略更新：在移动端，指定理想分辨率有时会导致无法获取流。
      // 我们改为只请求 video 和 facingMode，让浏览器决定最佳分辨率。
      try {
        return await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user' // 优先前置摄像头
            // 移除了 strict width/height 约束，提高兼容性
          },
          audio: false 
        });
      } catch (err) {
        console.warn("首选摄像头配置失败，尝试最宽松配置...", err);
        // 回退策略：只要是个摄像头就行
        try {
          return await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
          });
        } catch (finalErr) {
          throw finalErr;
        }
      }
    };

    const startCamera = async () => {
      try {
        setIsLoading(true);
        setHasPermissionError(false);

        const stream = await getCameraStream();
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // 必须设置 playsInline 以支持 iOS Safari
          videoRef.current.setAttribute('playsinline', 'true');
          
          // 等待元数据加载完毕
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && isMounted) {
               videoRef.current.play()
                .then(() => {
                   // 更新 Canvas 尺寸以匹配实际视频流尺寸
                   if (canvasRef.current) {
                     canvasRef.current.width = videoRef.current!.videoWidth;
                     canvasRef.current.height = videoRef.current!.videoHeight;
                   }
                   setIsLoading(false);
                   onStreamReady(videoRef.current!);
                })
                .catch(e => {
                   console.error("视频播放失败:", e);
                   onError("视频流无法播放，请检查浏览器设置或权限。");
                });
            }
          };
        }
      } catch (error: any) {
        console.error("访问摄像头失败:", error);
        setIsLoading(false);
        setHasPermissionError(true);
        
        let msg = "无法访问摄像头。";
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            msg = "摄像头权限被拒绝，请在浏览器设置中允许访问。";
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            msg = "未找到摄像头设备。";
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            msg = "摄像头正被其他应用占用。";
        }
        onError(msg);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [onStreamReady, onError]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-black group w-full h-full flex items-center justify-center">
      
      {/* Loading / Error States */}
      {isLoading && !hasPermissionError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900 text-gray-400">
           <Loader2 className="animate-spin mb-2" size={32} />
           <p className="text-sm">正在初始化摄像头...</p>
        </div>
      )}
      
      {hasPermissionError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900 text-red-400 p-4 text-center">
           <AlertCircle className="mb-2" size={32} />
           <p className="text-sm font-semibold">摄像头不可用</p>
           <p className="text-xs text-gray-500 mt-1">请检查权限或关闭占用摄像头的其他应用。</p>
        </div>
      )}

      {/* Video Layer */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
        autoPlay
        muted
        playsInline
      />
      
      {/* Skeleton Overlay Layer */}
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full pointer-events-none transform scale-x-[-1] transition-opacity duration-300 ${showSkeleton && !isLoading ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Controls Overlay */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button
          onClick={onToggleSkeleton}
          className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all border border-white/10"
          title={showSkeleton ? "隐藏骨架" : "显示骨架"}
        >
          {showSkeleton ? <Eye size={16} className="text-green-400" /> : <EyeOff size={16} className="text-gray-400" />}
        </button>
      </div>
    </div>
  );
});

VideoFeed.displayName = 'VideoFeed';
export default VideoFeed;