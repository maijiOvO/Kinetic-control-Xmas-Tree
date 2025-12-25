import React, { useRef, useState, useEffect } from 'react';
import { Music, Pause, Volume2, VolumeX } from 'lucide-react';

const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Attempt auto-play on mount
    if (audioRef.current) {
      audioRef.current.volume = 0.4; // Set reasonable default volume
      
      // We use a reliable online source since local file upload is not persistent in this environment
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.log("Auto-play prevented by browser. User must interact first.", error);
            setIsPlaying(false);
          });
      }
    }
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    }
  };

  return (
    <div className="flex items-center gap-2">
       {/* Used a stable public domain version of Jingle Bells (Kevin MacLeod) */}
       <audio ref={audioRef} src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Jingle_Bells_by_Kevin_MacLeod.ogg" loop />
       
       <button 
         onClick={togglePlay}
         className={`
            flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
            ${isPlaying 
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:bg-zinc-700'}
         `}
       >
          {isPlaying ? (
              <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <Pause size={16} />
                  <span className="text-xs font-bold uppercase">Playing BGM</span>
              </div>
          ) : (
              <div className="flex items-center gap-2">
                  <Music size={16} />
                  <span className="text-xs font-bold uppercase">Play Music</span>
              </div>
          )}
       </button>

       <button
         onClick={toggleMute}
         className="p-2 rounded-full bg-zinc-800 border border-zinc-700 text-gray-400 hover:text-white hover:bg-zinc-700 transition-colors"
         title={isMuted ? "Unmute" : "Mute"}
       >
         {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
       </button>
    </div>
  );
};

export default MusicPlayer;