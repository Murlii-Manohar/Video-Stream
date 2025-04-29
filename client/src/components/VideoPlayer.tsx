import React, { useState, useRef, useEffect } from "react";
import { 
  PlayIcon, 
  PauseIcon, 
  VolumeIcon, 
  Volume2Icon, 
  SettingsIcon, 
  MaximizeIcon,
  Volume1Icon,
  VolumeXIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onEnded?: () => void;
}

export function VideoPlayer({ src, poster, onEnded }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handle mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setMuted(newVolume === 0);
    }
  };
  
  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / progressBar.offsetWidth;
      videoRef.current.currentTime = pos * duration;
    }
  };
  
  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (playerRef.current) {
      if (!document.fullscreenElement) {
        playerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };
  
  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Show controls when hovering
  const showControls = () => {
    setIsControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setIsControlsVisible(false);
      }
    }, 3000);
  };
  
  // Update time and handle end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    
    const handleDurationChange = () => {
      setDuration(video.duration);
    };
    
    const handleVideoEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleVideoEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleVideoEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [onEnded]);
  
  // Handle volume icon based on state
  const VolumeIconComponent = () => {
    if (muted || volume === 0) return <VolumeXIcon className="h-5 w-5" />;
    if (volume < 0.4) return <VolumeIcon className="h-5 w-5" />;
    if (volume < 0.7) return <Volume1Icon className="h-5 w-5" />;
    return <Volume2Icon className="h-5 w-5" />;
  };

  return (
    <div 
      ref={playerRef}
      className="custom-video-player relative bg-black w-full aspect-video"
      onMouseMove={showControls}
      onMouseLeave={() => isPlaying && setIsControlsVisible(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={poster}
        src={src}
        onClick={togglePlay}
      />
      
      {/* Big play button in the center when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button 
            className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center"
            onClick={togglePlay}
          >
            <PlayIcon className="h-12 w-12 text-white" />
          </button>
        </div>
      )}
      
      {/* Video controls */}
      <div 
        className={cn(
          "video-controls absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent transition-opacity",
          isControlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress bar */}
        <div 
          className="progress-bar mb-2 rounded-full overflow-hidden cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="progress bg-primary"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          ></div>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              className="text-white focus:outline-none"
              onClick={togglePlay}
            >
              {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </button>
            
            <div className="flex items-center">
              <button 
                className="text-white mr-2 focus:outline-none"
                onClick={toggleMute}
              >
                <VolumeIconComponent />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 md:w-24"
              />
            </div>
            
            <span className="text-white text-sm hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              className="text-white focus:outline-none"
              aria-label="Settings"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
            
            <button 
              className="text-white focus:outline-none"
              onClick={toggleFullscreen}
            >
              <MaximizeIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
