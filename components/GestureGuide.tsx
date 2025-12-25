import React from 'react';

const GestureGuide: React.FC = () => {
  return (
    <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800">
      <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
        <span className="text-amber-500">✦</span> 魔法手势指南
      </h3>
      
      <div className="space-y-6">
        {/* Open Hand */}
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 flex-shrink-0 bg-black/50 rounded-lg border border-zinc-700 flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-amber-400">
              {/* Palm */}
              <circle cx="12" cy="14" r="3" />
              {/* Fingers spread */}
              <path d="M8 10L6 4" />
              <path d="M10 9L10 2" />
              <path d="M14 9L14 2" />
              <path d="M16 10L18 4" />
              <path d="M17 13L22 14" /> {/* Thumb */}
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-amber-400 text-sm">张开手掌 (Open)</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              缓慢张开：<span className="text-white">放大模型</span><br/>
              快速张开：<span className="text-white">切换形态 (树/爆炸/文字)</span>
            </p>
          </div>
        </div>

        {/* Fist */}
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 flex-shrink-0 bg-black/50 rounded-lg border border-zinc-700 flex items-center justify-center group-hover:border-red-500/50 transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-red-400">
              {/* Fist Shape */}
              <rect x="8" y="10" width="8" height="6" rx="2" />
              <path d="M9 10V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              <path d="M8 14h8" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-red-400 text-sm">握紧拳头 (Close)</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              缓慢握拳：<span className="text-white">缩小模型</span><br/>
              快速握拳：<span className="text-white">预备切换 / 重置</span>
            </p>
          </div>
        </div>

        {/* Pointing */}
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 flex-shrink-0 bg-black/50 rounded-lg border border-zinc-700 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-cyan-400">
              {/* Pointing Finger */}
              <path d="M12 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              <path d="M12 14V4" /> {/* Finger up */}
              <path d="M10 16c-2 0-3 1-3 3" />
              <path d="M14 16c2 0 3 1 3 3" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-cyan-400 text-sm">食指指引 (Point)</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              竖起食指移动：<br/>
              <span className="text-white">控制视角旋转 (上下左右)</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
        * 请保持手掌完全位于摄像头视野内
      </div>
    </div>
  );
};

export default GestureGuide;