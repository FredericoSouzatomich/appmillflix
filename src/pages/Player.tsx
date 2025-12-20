import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Content, Episode, contentApi, episodeApi } from "@/services/baserow";
import { playbackStorage } from "@/services/playbackStorage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  List,
  X,
  ChevronRight,
  Loader2,
  Sun,
} from "lucide-react";

// Proxy URL for HTTP content
const PROXY_URL = "https://proxy.tcavalcanti93.workers.dev/";
const PROXY_KEY = "IyusyTzNhDZDtZFi7jj72CIV3sIEZu6rcLR3xgvBbxJ";

const Player = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasAddedToHistory = useRef(false);

  const type = searchParams.get("type") || "Filme";
  const season = parseInt(searchParams.get("season") || "1", 10);
  const episodeNum = parseInt(searchParams.get("episode") || "1", 10);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressSaveInterval = useRef<NodeJS.Timeout | null>(null);
  
  const [content, setContent] = useState<Content | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [tvChannels, setTvChannels] = useState<Content[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [swipeActive, setSwipeActive] = useState<'volume' | 'brightness' | null>(null);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const volumeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const brightnessIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadContent(parseInt(id, 10));
    }
    
    return () => {
      // Save progress on unmount
      saveProgress();
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, [id]);

  useEffect(() => {
    if (type === "TV") {
      loadTVChannels();
    } else if (type === "Serie" && content?.Nome) {
      loadEpisodes(content.Nome, season);
    }
  }, [type, content, season]);

  useEffect(() => {
    if (episodes.length > 0) {
      const ep = episodes.find((e) => e["Episódio"] === episodeNum);
      setCurrentEpisode(ep || episodes[0]);
    }
  }, [episodes, episodeNum]);

  // Start periodic progress saving
  useEffect(() => {
    if (type !== "TV") {
      progressSaveInterval.current = setInterval(() => {
        saveProgress();
      }, 10000); // Save every 10 seconds
    }
    
    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, [content, currentEpisode, type]);

  // Restore playback position
  useEffect(() => {
    if (content && videoRef.current && type !== "TV") {
      const saved = playbackStorage.get(
        content.id,
        type === "Serie" ? currentEpisode?.id : undefined
      );
      
      if (saved && saved.currentTime > 0) {
        // Wait for video to be ready
        const handleCanPlay = () => {
          if (videoRef.current && saved.currentTime < videoRef.current.duration - 10) {
            videoRef.current.currentTime = saved.currentTime;
          }
          videoRef.current?.removeEventListener("canplay", handleCanPlay);
        };
        
        videoRef.current.addEventListener("canplay", handleCanPlay);
      }
    }
  }, [content, currentEpisode, type]);

  const saveProgress = useCallback(() => {
    if (!videoRef.current || !content || type === "TV") return;
    
    const video = videoRef.current;
    if (video.duration && video.currentTime > 0) {
      const progressPercent = (video.currentTime / video.duration) * 100;
      
      playbackStorage.save({
        contentId: content.id,
        episodeId: type === "Serie" ? currentEpisode?.id : undefined,
        progress: progressPercent,
        currentTime: video.currentTime,
        duration: video.duration,
        timestamp: Date.now(),
        contentName: content.Nome,
        contentCapa: content.Capa,
        contentTipo: content.Tipo,
        season: type === "Serie" ? season : undefined,
        episode: type === "Serie" ? episodeNum : undefined,
      });
    }
  }, [content, currentEpisode, type, season, episodeNum]);

  const loadContent = async (contentId: number) => {
    const data = await contentApi.getById(contentId);
    setContent(data);
    
    // Increment views and add to history
    if (data) {
      await contentApi.incrementViews(data.id, data.Views || 0);
      
      // Add to Baserow history (only once per session)
      if (user?.Email && !hasAddedToHistory.current && type !== "TV") {
        hasAddedToHistory.current = true;
        await contentApi.addToHistory(data.id, data.Histórico, user.Email);
      }
    }
  };

  const loadEpisodes = async (nome: string, temporada: number) => {
    const data = await episodeApi.getByContentAndSeason(nome, temporada);
    setEpisodes(data);
  };

  const loadTVChannels = async () => {
    const data = await contentApi.getByType("TV");
    setTvChannels(data);
  };

  const getVideoSource = (): string => {
    let sourceUrl = "";
    
    if (type === "Serie" && currentEpisode) {
      sourceUrl = currentEpisode.Link;
    } else {
      sourceUrl = content?.Link || "";
    }
    
    // If the source is HTTP, use the proxy
    if (sourceUrl && sourceUrl.startsWith("http://")) {
      const encodedUrl = encodeURIComponent(sourceUrl);
      return `${PROXY_URL}?key=${PROXY_KEY}&url=${encodedUrl}`;
    }
    
    return sourceUrl;
  };

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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    
    if (!container) return;
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // Try container fullscreen first (works on desktop)
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        } 
        // For iOS Safari, use video element fullscreen
        else if (video && (video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        }
      }
    } catch (error) {
      // Fallback for mobile: try video element fullscreen
      if (video) {
        if ((video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        } else if ((video as any).requestFullscreen) {
          await (video as any).requestFullscreen();
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progressValue = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(isNaN(progressValue) ? 0 : progressValue);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  const handleNextEpisode = () => {
    saveProgress();
    if (type === "Serie" && currentEpisode) {
      const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id);
      if (currentIndex < episodes.length - 1) {
        const nextEp = episodes[currentIndex + 1];
        navigate(`/player/${id}?type=Serie&season=${season}&episode=${nextEp["Episódio"]}`);
      }
    }
  };

  const handlePreviousEpisode = () => {
    saveProgress();
    if (type === "Serie" && currentEpisode) {
      const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id);
      if (currentIndex > 0) {
        const prevEp = episodes[currentIndex - 1];
        navigate(`/player/${id}?type=Serie&season=${season}&episode=${prevEp["Episódio"]}`);
      }
    }
  };

  const selectEpisode = (episode: Episode) => {
    saveProgress();
    navigate(`/player/${id}?type=Serie&season=${episode.Temporada}&episode=${episode["Episódio"]}`);
    setShowEpisodeList(false);
  };

  const selectChannel = (channel: Content) => {
    navigate(`/player/${channel.id}?type=TV`);
    setShowChannelList(false);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleDoubleTap = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0] || e.changedTouches[0];
    const currentTime = Date.now();
    const tapX = touch.clientX;
    const screenWidth = window.innerWidth;
    
    const timeDiff = currentTime - lastTapRef.current.time;
    const xDiff = Math.abs(tapX - lastTapRef.current.x);
    
    // Double tap detected (within 300ms and 50px)
    if (timeDiff < 300 && xDiff < 50) {
      e.preventDefault();
      
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
      }
      
      const isLeftSide = tapX < screenWidth / 2;
      
      if (videoRef.current) {
        if (isLeftSide) {
          // Rewind 10 seconds
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          setDoubleTapSide('left');
        } else {
          // Forward 10 seconds
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          setDoubleTapSide('right');
        }
        
        // Hide feedback after animation
        setTimeout(() => setDoubleTapSide(null), 500);
      }
      
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: currentTime, x: tapX };
      
      // Single tap - toggle controls after short delay
      doubleTapTimeoutRef.current = setTimeout(() => {
        handleMouseMove();
      }, 300);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Only activate vertical swipe if movement is more vertical than horizontal
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
      const isRightSide = touchStartRef.current.x > screenWidth / 2;
      
      // Calculate change based on swipe distance (full screen height = 100% change)
      const changePercent = -deltaY / (screenHeight * 0.5);
      
      if (isRightSide) {
        // Volume control on right side
        const newVolume = Math.max(0, Math.min(1, volume + changePercent * 0.1));
        if (videoRef.current) {
          videoRef.current.volume = newVolume;
          setVolume(newVolume);
          setIsMuted(newVolume === 0);
        }
        setSwipeActive('volume');
        setShowVolumeIndicator(true);
        
        if (volumeIndicatorTimeoutRef.current) {
          clearTimeout(volumeIndicatorTimeoutRef.current);
        }
      } else {
        // Brightness control on left side
        const newBrightness = Math.max(0.2, Math.min(1, brightness + changePercent * 0.1));
        setBrightness(newBrightness);
        setSwipeActive('brightness');
        setShowBrightnessIndicator(true);
        
        if (brightnessIndicatorTimeoutRef.current) {
          clearTimeout(brightnessIndicatorTimeoutRef.current);
        }
      }
      
      // Update touch start for continuous tracking
      touchStartRef.current = {
        ...touchStartRef.current,
        y: touch.clientY
      };
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setSwipeActive(null);
    
    // Hide indicators after delay
    volumeIndicatorTimeoutRef.current = setTimeout(() => {
      setShowVolumeIndicator(false);
    }, 1000);
    
    brightnessIndicatorTimeoutRef.current = setTimeout(() => {
      setShowBrightnessIndicator(false);
    }, 1000);
  };

  const handleBack = () => {
    saveProgress();
    navigate(-1);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentTime = videoRef.current?.currentTime || 0;
  const duration = videoRef.current?.duration || 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-background z-50"
      onMouseMove={handleMouseMove}
      onTouchStart={(e) => {
        handleDoubleTap(e);
        handleTouchStart(e);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        src={getVideoSource()}
        className="w-full h-full object-contain bg-background"
        style={{ filter: `brightness(${brightness})` }}
        onTimeUpdate={() => {
          handleTimeUpdate();
          // If video is playing and time is updating, it's not buffering
          if (isBuffering || isLoading) {
            setIsBuffering(false);
            setIsLoading(false);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsLoading(false);
        }}
        onCanPlay={() => {
          setIsLoading(false);
          setIsBuffering(false);
        }}
        onCanPlayThrough={() => {
          setIsLoading(false);
          setIsBuffering(false);
        }}
        onLoadStart={() => setIsLoading(true)}
        onEnded={() => {
          // Remove from continue watching if completed
          if (content && type !== "TV") {
            playbackStorage.remove(
              content.id,
              type === "Serie" ? currentEpisode?.id : undefined
            );
          }
        }}
        onClick={togglePlay}
        autoPlay
        playsInline
        crossOrigin="anonymous"
        preload="auto"
      />

      {/* Loading/Buffering Overlay */}
      {(isLoading || isBuffering) && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 pointer-events-none z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <span className="text-foreground text-sm">
              {isLoading ? "Carregando..." : "Buffering..."}
            </span>
          </div>
        </div>
      )}

      {/* Double Tap Feedback */}
      {doubleTapSide && (
        <div 
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-20 animate-pulse ${
            doubleTapSide === 'left' ? 'left-1/4' : 'right-1/4'
          }`}
        >
          <div className="bg-background/70 backdrop-blur-sm rounded-full p-4 flex flex-col items-center gap-1">
            {doubleTapSide === 'left' ? (
              <SkipBack className="w-8 h-8 text-foreground" />
            ) : (
              <SkipForward className="w-8 h-8 text-foreground" />
            )}
            <span className="text-foreground text-sm font-medium">10s</span>
          </div>
        </div>
      )}

      {/* Volume Indicator */}
      {showVolumeIndicator && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none z-20">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 flex flex-col items-center gap-2">
            {volume === 0 ? (
              <VolumeX className="w-6 h-6 text-foreground" />
            ) : (
              <Volume2 className="w-6 h-6 text-foreground" />
            )}
            <div className="w-1 h-24 bg-muted rounded-full overflow-hidden rotate-180">
              <div 
                className="w-full bg-primary transition-all duration-100 rounded-full"
                style={{ height: `${volume * 100}%` }}
              />
            </div>
            <span className="text-foreground text-xs font-medium">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Brightness Indicator */}
      {showBrightnessIndicator && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none z-20">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 flex flex-col items-center gap-2">
            <Sun className="w-6 h-6 text-foreground" />
            <div className="w-1 h-24 bg-muted rounded-full overflow-hidden rotate-180">
              <div 
                className="w-full bg-primary transition-all duration-100 rounded-full"
                style={{ height: `${brightness * 100}%` }}
              />
            </div>
            <span className="text-foreground text-xs font-medium">{Math.round(brightness * 100)}%</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-background/80 to-transparent p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="tv-focus">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-foreground">{content?.Nome}</h1>
              {type === "Serie" && currentEpisode && (
                <p className="text-sm text-muted-foreground">
                  T{season} E{currentEpisode["Episódio"]}
                </p>
              )}
            </div>
            <div className="w-24" />
          </div>
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={togglePlay}
            className="w-24 h-24 rounded-full bg-primary/80 backdrop-blur flex items-center justify-center hover:bg-primary transition-all duration-300 pointer-events-auto tv-focus"
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 text-primary-foreground" fill="currentColor" />
            ) : (
              <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
            )}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-6">
          {/* Time Display */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full h-2 bg-secondary rounded-full cursor-pointer mb-6 group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <Button variant="ghost" size="icon" onClick={togglePlay} className="tv-focus">
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>

              {/* Previous (for series) */}
              {type === "Serie" && (
                <Button variant="ghost" size="icon" onClick={handlePreviousEpisode} className="tv-focus">
                  <SkipBack className="w-6 h-6" />
                </Button>
              )}

              {/* Next (for series) */}
              {type === "Serie" && (
                <Button variant="ghost" size="icon" onClick={handleNextEpisode} className="tv-focus">
                  <SkipForward className="w-6 h-6" />
                </Button>
              )}

              {/* Volume */}
              <Button variant="ghost" size="icon" onClick={toggleMute} className="tv-focus">
                {isMuted ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </Button>

              {/* Playback Speed */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="tv-focus text-sm font-medium min-w-[50px]"
                >
                  {playbackSpeed}x
                </Button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg overflow-hidden">
                    {speedOptions.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changePlaybackSpeed(speed)}
                        className={`block w-full px-4 py-2 text-sm hover:bg-accent transition-colors ${
                          playbackSpeed === speed ? "bg-primary text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Episode List (for series) */}
              {type === "Serie" && (
                <Button
                  variant="ghost"
                  onClick={() => setShowEpisodeList(true)}
                  className="tv-focus hidden sm:flex"
                >
                  <List className="w-5 h-5 mr-2" />
                  Episódios
                </Button>
              )}
              {type === "Serie" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEpisodeList(true)}
                  className="tv-focus sm:hidden"
                >
                  <List className="w-5 h-5" />
                </Button>
              )}

              {/* Channel List (for TV) */}
              {type === "TV" && (
                <Button
                  variant="ghost"
                  onClick={() => setShowChannelList(true)}
                  className="tv-focus hidden sm:flex"
                >
                  <List className="w-5 h-5 mr-2" />
                  Canais
                </Button>
              )}
              {type === "TV" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChannelList(true)}
                  className="tv-focus sm:hidden"
                >
                  <List className="w-5 h-5" />
                </Button>
              )}

              {/* Fullscreen - always visible */}
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="tv-focus flex-shrink-0">
                <Maximize className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Episode List Sidebar */}
      {showEpisodeList && (
        <div className="absolute inset-y-0 right-0 w-96 bg-card/95 backdrop-blur border-l border-border animate-slide-up">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Episódios - T{season}</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowEpisodeList(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-80px)] p-4">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                onClick={() => selectEpisode(episode)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl mb-2 transition-all tv-focus ${
                  currentEpisode?.id === episode.id
                    ? "bg-primary/20 border border-primary"
                    : "bg-secondary/50 hover:bg-secondary"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                  <span className="font-bold text-foreground">{episode["Episódio"]}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Episódio {episode["Episódio"]}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Channel List Sidebar */}
      {showChannelList && (
        <div className="absolute inset-y-0 right-0 w-96 bg-card/95 backdrop-blur border-l border-border animate-slide-up">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Canais de TV</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowChannelList(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-80px)] p-4">
            {tvChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => selectChannel(channel)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl mb-2 transition-all tv-focus ${
                  content?.id === channel.id
                    ? "bg-primary/20 border border-primary"
                    : "bg-secondary/50 hover:bg-secondary"
                }`}
              >
                <img
                  src={channel.Capa || "/placeholder.svg"}
                  alt={channel.Nome}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{channel.Nome}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
