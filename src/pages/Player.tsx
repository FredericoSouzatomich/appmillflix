import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Content, Episode, contentApi, episodeApi } from "@/services/baserow";
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
} from "lucide-react";

const Player = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get("type") || "Filme";
  const season = parseInt(searchParams.get("season") || "1", 10);
  const episodeNum = parseInt(searchParams.get("episode") || "1", 10);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [content, setContent] = useState<Content | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [tvChannels, setTvChannels] = useState<Content[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadContent(parseInt(id, 10));
    }
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

  const loadContent = async (contentId: number) => {
    const data = await contentApi.getById(contentId);
    setContent(data);
    
    // Increment views
    if (data) {
      await contentApi.incrementViews(data.id, data.Views || 0);
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
    if (type === "Serie" && currentEpisode) {
      return currentEpisode.Link;
    }
    return content?.Link || "";
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

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(isNaN(progress) ? 0 : progress);
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
    if (type === "Serie" && currentEpisode) {
      const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id);
      if (currentIndex < episodes.length - 1) {
        const nextEp = episodes[currentIndex + 1];
        navigate(`/player/${id}?type=Serie&season=${season}&episode=${nextEp["Episódio"]}`);
      }
    }
  };

  const handlePreviousEpisode = () => {
    if (type === "Serie" && currentEpisode) {
      const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id);
      if (currentIndex > 0) {
        const prevEp = episodes[currentIndex - 1];
        navigate(`/player/${id}?type=Serie&season=${season}&episode=${prevEp["Episódio"]}`);
      }
    }
  };

  const selectEpisode = (episode: Episode) => {
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

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-background z-50"
      onMouseMove={handleMouseMove}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        src={getVideoSource()}
        className="w-full h-full object-contain bg-background"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        autoPlay
      />

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
            </div>

            <div className="flex items-center gap-4">
              {/* Episode List (for series) */}
              {type === "Serie" && (
                <Button
                  variant="ghost"
                  onClick={() => setShowEpisodeList(true)}
                  className="tv-focus"
                >
                  <List className="w-5 h-5 mr-2" />
                  Episódios
                </Button>
              )}

              {/* Channel List (for TV) */}
              {type === "TV" && (
                <Button
                  variant="ghost"
                  onClick={() => setShowChannelList(true)}
                  className="tv-focus"
                >
                  <List className="w-5 h-5 mr-2" />
                  Canais
                </Button>
              )}

              {/* Fullscreen */}
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="tv-focus">
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
