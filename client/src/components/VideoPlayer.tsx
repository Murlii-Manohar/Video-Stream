import React, { useState, useRef, useEffect } from "react";
import { 
  PlayIcon, 
  PauseIcon, 
  VolumeIcon, 
  Volume2Icon, 
  SettingsIcon, 
  MaximizeIcon,
  Volume1Icon,
  VolumeXIcon,
  CheckIcon,
  SkipForwardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IntroVideo {
  enabled: boolean;
  url: string | null;
  duration: number;
}

interface AdInfo {
  url: string;
  startTime?: number;
  skippable: boolean;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  introVideo?: IntroVideo;
  adInfo?: AdInfo;
  onEnded?: () => void;
}

export function VideoPlayer({ src, poster, introVideo, adInfo, onEnded }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Intro video states
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [introEnded, setIntroEnded] = useState(false);
  const [isSkippingIntro, setIsSkippingIntro] = useState(false);
  
  // Ad states
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adEnded, setAdEnded] = useState(false);
  const [adTime, setAdTime] = useState(0);
  const [canSkipAd, setCanSkipAd] = useState(false);
  const [isSkippingAd, setIsSkippingAd] = useState(false);
  
  // Available video quality options
  const qualityOptions = ["auto", "1080p", "720p", "480p", "360p"];
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const adTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Check for intro video and ad on initial mount
  useEffect(() => {
    // Check if intro video is available and enabled
    if (introVideo && introVideo.enabled && introVideo.url) {
      setIsIntroPlaying(true);
    }
    
    // Check if ad is available
    if (adInfo && adInfo.url) {
      setIsAdPlaying(true);
      setAdEnded(false);
    }
  }, [introVideo, adInfo]);
  
  // Handle intro video playback and switching to main video
  useEffect(() => {
    const introVideoElement = introVideoRef.current;
    const mainVideoElement = videoRef.current;
    
    if (!introVideoElement || !mainVideoElement) return;
    
    if (isIntroPlaying && introVideo && introVideo.url) {
      // Setup intro video listeners
      const handleIntroEnded = () => {
        setIsIntroPlaying(false);
        setIntroEnded(true);
        
        // Play the main video automatically
        mainVideoElement.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error("Error playing main video:", err));
      };
      
      const handleIntroError = (err: any) => {
        console.error("Error playing intro video:", err);
        setIsIntroPlaying(false);
        setIntroEnded(true);
      };
      
      // Setup intro video event listeners
      introVideoElement.addEventListener('ended', handleIntroEnded);
      introVideoElement.addEventListener('error', handleIntroError);
      
      // Try to play the intro video
      introVideoElement.play()
        .catch(err => {
          console.error("Error auto-playing intro:", err);
          setIsIntroPlaying(false);
          setIntroEnded(true);
        });
      
      return () => {
        introVideoElement.removeEventListener('ended', handleIntroEnded);
        introVideoElement.removeEventListener('error', handleIntroError);
      };
    }
  }, [isIntroPlaying, introVideo]);
  
  // Skip intro handler
  const handleSkipIntro = () => {
    setIsSkippingIntro(true);
    
    // Pause the intro video
    if (introVideoRef.current) {
      introVideoRef.current.pause();
    }
    
    // Set states to show main video
    setIsIntroPlaying(false);
    setIntroEnded(true);
    
    // Try to play the main video
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Error playing main video after skip:", err));
    }
    
    // Reset skip state for animation purposes
    setTimeout(() => {
      setIsSkippingIntro(false);
    }, 300);
  };
  
  // Skip ad handler
  const handleSkipAd = () => {
    setIsSkippingAd(true);
    
    // Pause the ad video
    if (adVideoRef.current) {
      adVideoRef.current.pause();
    }
    
    // Set states to show main video
    setIsAdPlaying(false);
    setAdEnded(true);
    
    // Try to play the main video
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Error playing main video after ad skip:", err));
    }
    
    // Reset skip state for animation purposes
    setTimeout(() => {
      setIsSkippingAd(false);
    }, 300);
  };
  
  // Handle ad video playback and timing
  useEffect(() => {
    const adVideoElement = adVideoRef.current;
    const mainVideoElement = videoRef.current;
    
    if (!adVideoElement || !mainVideoElement || !adInfo) return;
    
    if (isAdPlaying && adInfo.url) {
      // Set up ad video event listeners
      const handleAdEnded = () => {
        setIsAdPlaying(false);
        setAdEnded(true);
        
        // Play the main video automatically
        mainVideoElement.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error("Error playing main video after ad:", err));
      };
      
      const handleAdError = (err: any) => {
        console.error("Error playing ad video:", err);
        setIsAdPlaying(false);
        setAdEnded(true);
      };
      
      const handleAdTimeUpdate = () => {
        if (adVideoElement) {
          setAdTime(adVideoElement.currentTime);
          
          // Enable skip button after 5 seconds if the ad is skippable
          if (adInfo.skippable && adVideoElement.currentTime >= 5 && !canSkipAd) {
            setCanSkipAd(true);
          }
        }
      };
      
      // Set up event listeners
      adVideoElement.addEventListener('ended', handleAdEnded);
      adVideoElement.addEventListener('error', handleAdError);
      adVideoElement.addEventListener('timeupdate', handleAdTimeUpdate);
      
      // Try to play the ad video
      adVideoElement.play()
        .catch(err => {
          console.error("Error auto-playing ad:", err);
          setIsAdPlaying(false);
          setAdEnded(true);
        });
      
      return () => {
        adVideoElement.removeEventListener('ended', handleAdEnded);
        adVideoElement.removeEventListener('error', handleAdError);
        adVideoElement.removeEventListener('timeupdate', handleAdTimeUpdate);
        if (adTimerRef.current) {
          clearTimeout(adTimerRef.current);
        }
      };
    }
  }, [isAdPlaying, adInfo, canSkipAd]);
  
  // Update time and handle end for main video
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
  
  // Handle quality change
  const handleQualityChange = (quality: string) => {
    // Save current playback position
    const currentPosition = videoRef.current?.currentTime || 0;
    const wasPlaying = isPlaying;
    
    // In a real implementation, this would switch video sources to different quality versions
    // For now, we'll just update the state
    setCurrentQuality(quality);
    
    // This would simulate changing the video source:
    // 1. Update src attribute with quality-specific URL
    // 2. Load the new source
    // 3. Seek to previous position
    // 4. Resume playback if it was playing
    
    // Simulate a source change by logging
    console.log(`Quality changed to ${quality}`);
    
    // For demonstration, we'll just set a timeout to simulate loading the new quality
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentPosition;
        if (wasPlaying) {
          videoRef.current.play().catch(err => console.error("Error resuming playback:", err));
        }
      }
    }, 500);
  };

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
      {/* Intro Video */}
      {isIntroPlaying && introVideo?.url && (
        <div className="absolute inset-0 z-30 bg-black">
          <video
            ref={introVideoRef}
            className="w-full h-full"
            src={introVideo.url}
            muted={muted}
            autoPlay
          />
          
          {/* Skip intro button */}
          <button
            className={cn(
              "absolute bottom-12 right-8 py-2 px-4 bg-primary text-white rounded-md flex items-center transition-opacity",
              isSkippingIntro ? "opacity-0" : "opacity-100"
            )}
            onClick={handleSkipIntro}
          >
            <span className="mr-2">Skip Intro</span>
            <SkipForwardIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Ad Video */}
      {isAdPlaying && adInfo && adInfo.url && (
        <div className="absolute inset-0 z-20 bg-black">
          <video
            ref={adVideoRef}
            className="w-full h-full"
            src={adInfo.url}
            muted={muted}
            autoPlay
          />
          
          {/* Advertisement label */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded-md">
            <span className="text-white text-sm font-medium">Advertisement</span>
          </div>
          
          {/* Timer display */}
          <div className="absolute bottom-20 right-8 bg-black bg-opacity-50 px-3 py-1 rounded-md">
            <span className="text-white text-sm">{Math.ceil(5 - adTime) > 0 ? `Ad: ${Math.ceil(5 - adTime)}` : 'Ad'}</span>
          </div>
          
          {/* Skip ad button - only shown when allowed */}
          {adInfo.skippable && (
            <button
              className={cn(
                "absolute bottom-12 right-8 py-2 px-4 bg-primary text-white rounded-md flex items-center transition-all",
                canSkipAd ? "opacity-100 cursor-pointer" : "opacity-50 cursor-not-allowed",
                isSkippingAd ? "transform translate-x-4 opacity-0" : ""
              )}
              onClick={canSkipAd ? handleSkipAd : undefined}
              disabled={!canSkipAd}
            >
              <span className="mr-2">Skip Ad</span>
              <SkipForwardIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      
      {/* Main Video */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-300",
        isIntroPlaying || isAdPlaying ? "opacity-0" : "opacity-100"
      )}>
        <video
          ref={videoRef}
          className="w-full h-full"
          poster={poster}
          src={src}
          onClick={togglePlay}
          preload="auto"
        />
        
        {/* Big play button in the center when paused */}
        {!isPlaying && !isIntroPlaying && !isAdPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button 
              className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center"
              onClick={togglePlay}
            >
              <PlayIcon className="h-12 w-12 text-white" />
            </button>
          </div>
        )}
      </div>
      
      {/* Video controls - only shown for main video */}
      {!isIntroPlaying && (
        <div 
          className={cn(
            "video-controls absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent transition-opacity",
            isControlsVisible ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress bar */}
          <div 
            className="progress-bar mb-2 h-2 rounded-full overflow-hidden cursor-pointer bg-gray-700"
            onClick={handleProgressClick}
          >
            <div 
              className="progress h-full bg-primary"
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="text-white focus:outline-none"
                    aria-label="Settings"
                    onClick={() => setSettingsOpen(!settingsOpen)}
                  >
                    <SettingsIcon className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-black bg-opacity-90 border-gray-700">
                  <div className="px-2 py-1.5 text-sm font-medium text-white border-b border-gray-700">
                    Video Quality
                  </div>
                  {qualityOptions.map((quality) => (
                    <DropdownMenuItem 
                      key={quality}
                      className="flex justify-between items-center cursor-pointer text-white hover:bg-gray-800"
                      onClick={() => handleQualityChange(quality)}
                    >
                      {quality}
                      {currentQuality === quality && (
                        <CheckIcon className="h-4 w-4 ml-2" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <button 
                className="text-white focus:outline-none"
                onClick={toggleFullscreen}
              >
                <MaximizeIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
