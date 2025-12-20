import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Content, Episode, contentApi, episodeApi } from "@/services/baserow";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Clock, Eye, Star, ChevronDown } from "lucide-react";

const ContentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadContent(parseInt(id, 10));
    }
  }, [id]);

  useEffect(() => {
    if (content?.Tipo === "Serie" && content.Nome) {
      loadEpisodes(content.Nome, selectedSeason);
    }
  }, [content, selectedSeason]);

  const loadContent = async (contentId: number) => {
    try {
      setIsLoading(true);
      const data = await contentApi.getById(contentId);
      setContent(data);
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEpisodes = async (nome: string, temporada: number) => {
    try {
      const data = await episodeApi.getByContentAndSeason(nome, temporada);
      setEpisodes(data);
    } catch (error) {
      console.error("Error loading episodes:", error);
    }
  };

  const handlePlay = async () => {
    if (!content) return;
    
    // Increment views
    await contentApi.incrementViews(content.id, content.Views || 0);
    
    if (content.Tipo === "Filme" || content.Tipo === "TV") {
      navigate(`/player/${content.id}?type=${content.Tipo}`);
    }
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (!content) return;
    navigate(`/player/${content.id}?type=Serie&season=${selectedSeason}&episode=${episode["Episódio"]}`);
  };

  const getSeasons = (): number[] => {
    if (!content?.Temporadas) return [];
    return Array.from({ length: content.Temporadas }, (_, i) => i + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Conteúdo não encontrado</p>
        <Button onClick={() => navigate("/")} variant="outline">
          Voltar ao início
        </Button>
      </div>
    );
  }

  const isSeries = content.Tipo === "Serie";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[70vh] overflow-hidden">
        <img
          src={content.Capa || "/placeholder.svg"}
          alt={content.Nome}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 tv-focus"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>

        {/* Content Info */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 text-sm font-medium bg-primary/20 text-primary rounded-full">
                {content.Tipo}
              </span>
              {content.Categoria && content.Categoria.split(",").map((cat) => cat.trim()).filter(Boolean).map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground rounded-full"
                >
                  {category}
                </span>
              ))}
              {content.Idioma && (
                <span className="px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground rounded-full">
                  {content.Idioma}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-shadow">
              {content.Nome}
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{content.Views?.toLocaleString() || 0} visualizações</span>
              </div>
              {isSeries && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{content.Temporadas} temporada(s)</span>
                </div>
              )}
            </div>

            <p className="text-foreground/80 text-lg mb-8 max-w-2xl line-clamp-3">
              {content.Sinopse}
            </p>

            {!isSeries && (
              <Button
                size="xl"
                variant="hero"
                onClick={handlePlay}
                className="tv-focus"
              >
                <Play className="w-6 h-6" fill="currentColor" />
                Assistir Agora
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Series Episodes Section */}
      {isSeries && (
        <div className="container mx-auto px-6 py-12">
          {/* Season Selector */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                className="min-w-[200px] justify-between tv-focus"
              >
                Temporada {selectedSeason}
                <ChevronDown className={`w-4 h-4 transition-transform ${isSeasonDropdownOpen ? "rotate-180" : ""}`} />
              </Button>

              {isSeasonDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-lg z-10 animate-scale-in">
                  {getSeasons().map((season) => (
                    <button
                      key={season}
                      onClick={() => {
                        setSelectedSeason(season);
                        setIsSeasonDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-secondary transition-colors tv-focus ${
                        season === selectedSeason ? "bg-primary/10 text-primary" : "text-foreground"
                      }`}
                    >
                      Temporada {season}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Episodes Grid */}
          <div className="grid gap-4">
            {episodes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum episódio encontrado para esta temporada
              </div>
            ) : (
              episodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => handlePlayEpisode(episode)}
                  className="flex items-center gap-6 p-4 bg-card/50 hover:bg-card border border-border/30 hover:border-primary/50 rounded-xl transition-all duration-300 tv-focus group"
                >
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {episode["Episódio"]}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      Episódio {episode["Episódio"]}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Temporada {episode.Temporada}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                    <Play className="w-5 h-5 text-foreground group-hover:text-primary-foreground transition-colors" fill="currentColor" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDetail;
