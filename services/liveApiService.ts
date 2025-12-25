import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { HandTrackingResult } from '../types';

export class LocalGestureService {
  private handLandmarker: HandLandmarker | null = null;
  private drawingUtils: DrawingUtils | null = null;
  
  public async initialize(): Promise<void> {
    if (this.handLandmarker) return;

    console.log("正在初始化视觉服务...");

    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        const modelAssetPath = `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`;

        // === 关键修复：移动端检测 ===
        // 移动浏览器（特别是 iOS Safari）在同时运行 Three.js 和 MediaPipe GPU 模式时，
        // 极易发生 WebGL 上下文丢失或崩溃。
        // 因此，在移动端我们强制使用 CPU 模式，虽然 FPS 略低，但能保证功能可用。
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            console.log("检测到移动设备，强制使用 CPU 模式以保证稳定性。");
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelAssetPath,
                delegate: "CPU" // 强制 CPU
              },
              runningMode: "VIDEO",
              numHands: 1,
              minHandDetectionConfidence: 0.4, // CPU 模式下稍微降低阈值以提高召回率
              minHandPresenceConfidence: 0.4,
              minTrackingConfidence: 0.4
            });
        } else {
            // 桌面端尝试 GPU 优先
            try {
                console.log("尝试使用 GPU 加速...");
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                  baseOptions: {
                    modelAssetPath: modelAssetPath,
                    delegate: "GPU"
                  },
                  runningMode: "VIDEO",
                  numHands: 1,
                  minHandDetectionConfidence: 0.5,
                  minHandPresenceConfidence: 0.5,
                  minTrackingConfidence: 0.5
                });
                console.log("MediaPipe GPU 模式初始化成功。");
            } catch (gpuError) {
                console.warn("GPU 初始化失败，回退到 CPU 模式...", gpuError);
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                  baseOptions: {
                    modelAssetPath: modelAssetPath,
                    delegate: "CPU"
                  },
                  runningMode: "VIDEO",
                  numHands: 1
                });
                console.log("MediaPipe CPU 模式初始化成功。");
            }
        }
    } catch (e) {
        console.error("MediaPipe 初始化严重错误:", e);
        throw e;
    }
  }

  public processVideoFrame(video: HTMLVideoElement, debugCanvas?: HTMLCanvasElement): HandTrackingResult {
    const noResult: HandTrackingResult = { x: 0.5, y: 0.5, isDetected: false, gesture: 'NONE', handSpread: 0 };

    if (!this.handLandmarker) return noResult;
    
    // 严格的安全检查，防止在视频未准备好时崩在 processVideoFrame
    if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
        return noResult;
    }

    try {
      const startTimeMs = performance.now();
      const result = this.handLandmarker.detectForVideo(video, startTimeMs);

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        
        // --- 1. 基础指标 ---
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        // 比例参考：手腕到中指指根的距离
        const palmScale = Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y);

        // --- 2. 计算手指状态 ---
        const isIndexExtended = this.isFingerExtended(landmarks, 8, 6, palmScale);
        const isMiddleExtended = this.isFingerExtended(landmarks, 12, 10, palmScale);
        const isRingExtended = this.isFingerExtended(landmarks, 16, 14, palmScale);
        const isPinkyExtended = this.isFingerExtended(landmarks, 20, 18, palmScale);
        const isThumbExtended = this.isThumbExtended(landmarks, palmScale);

        // --- 3. 严格手势逻辑 ---
        const areOthersCurled = !isMiddleExtended && !isRingExtended && !isPinkyExtended;

        let gesture = 'GENERAL';
        let pointingTipIndex = -1;

        if (areOthersCurled) {
            if (isIndexExtended) {
                gesture = 'POINTING';
                pointingTipIndex = 8; // 食指指尖
            } else if (isThumbExtended) {
                gesture = 'POINTING';
                pointingTipIndex = 4; // 拇指指尖
            }
        }
        
        // --- 4. 计算张开度 (Spread) ---
        const allTips = [4, 8, 12, 16, 20];
        const centroid = this.calculateCentroid(landmarks, allTips);
        let totalDist = 0;
        allTips.forEach(id => {
            totalDist += Math.hypot(landmarks[id].x - centroid.x, landmarks[id].y - centroid.y);
        });
        const handSpread = (totalDist / 5) / palmScale;

        // --- 5. 确定目标坐标 ---
        let targetX = 0.5;
        let targetY = 0.5;
        let debugPoint = { x: 0, y: 0 };

        if (gesture === 'POINTING' && pointingTipIndex !== -1) {
           targetX = landmarks[pointingTipIndex].x;
           targetY = landmarks[pointingTipIndex].y;
           debugPoint = { x: targetX, y: targetY };
        } else {
           // 普通模式：追踪重心
           targetX = centroid.x;
           targetY = centroid.y;
           debugPoint = centroid;
        }

        // --- 6. 绘制调试信息 ---
        if (debugCanvas) {
          this.drawDebug(debugCanvas, landmarks, debugPoint, gesture, handSpread);
        }

        return {
          x: 1 - targetX, // 镜像 X 轴
          y: targetY,
          isDetected: true,
          gesture: gesture,
          handSpread: handSpread
        };
      }
    } catch (error) {
      // 忽略偶尔的帧错误，避免控制台刷屏
      return noResult;
    }

    // 如果没检测到手但 Canvas 存在，清空 Canvas
    if (debugCanvas) {
        const ctx = debugCanvas.getContext('2d');
        ctx?.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    }

    return noResult;
  }

  // --- 辅助函数 ---

  private isFingerExtended(landmarks: any[], tipIdx: number, pipIdx: number, palmScale: number): boolean {
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    
    const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    
    // 移动端由于画质可能较差，稍微降低判定阈值 (0.15)
    return dTip > (dPip + (palmScale * 0.15)); 
  }

  private isThumbExtended(landmarks: any[], palmScale: number): boolean {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const pinkyMCP = landmarks[17]; 

    const dTip = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);
    const dIP = Math.hypot(thumbIP.x - pinkyMCP.x, thumbIP.y - pinkyMCP.y);

    return dTip > (dIP + (palmScale * 0.1));
  }

  private calculateCentroid(landmarks: any[], specificIndices: number[]): { x: number, y: number } {
    let sumX = 0;
    let sumY = 0;
    specificIndices.forEach(id => {
      sumX += landmarks[id].x;
      sumY += landmarks[id].y;
    });
    return { x: sumX / specificIndices.length, y: sumY / specificIndices.length };
  }

  private drawDebug(canvas: HTMLCanvasElement, landmarks: any[], activePoint: {x:number, y:number}, gesture: string, spread: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.drawingUtils) this.drawingUtils = new DrawingUtils(ctx);

    // 绘制骨架
    this.drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
    this.drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1, radius: 3 });
    
    // 绘制激活点
    ctx.beginPath();
    ctx.arc(activePoint.x * canvas.width, activePoint.y * canvas.height, 10, 0, 2 * Math.PI);
    
    if (gesture === 'POINTING') ctx.fillStyle = "#FFFF00"; 
    else ctx.fillStyle = "#00FFFF";
    
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }
}