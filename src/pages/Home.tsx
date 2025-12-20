import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Banner, Content, bannerApi, contentApi, categoryApi, Category } from "@/services/baserow";
import { playbackStorage, PlaybackProgress } from "@/services/playbackStorage";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, Search, Tv2, Clock, TrendingUp, Heart, PlayCircle, User,
  Sword, Drama, Laugh, Ghost, Heart as HeartIcon, Rocket, Users, Sparkles, Film, Tv, Menu, X
} from "lucide-react";
import ContentCard from "@/components/ContentCard";
import BannerCarousel from "@/components/BannerCarousel";
import ContinueWatchingCard from "@/components/ContinueWatchingCard";
import CategoryCard from "@/components/CategoryCard";
import NotificationBell from "@/components/NotificationBell";
import HorizontalScrollList from "@/components/HorizontalScrollList";
import { useIsMobile } from "@/hooks/use-mobile";

const Home = () => {
  const { user, logout, checkSubscription, checkDeviceConnected } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [recentContent, setRecentContent] = useState<Content[]>([]);
  const [popularContent, setPopularContent] = useState<Content[]>([]);
  const [recentMovies, setRecentMovies] = useState<Content[]>([]);
  const [recentSeries, setRecentSeries] = useState<Content[]>([]);
  const [favorites, setFavorites] = useState<Content[]>([]);
  const [continueWatching, setContinueWatching] = useState<PlaybackProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth and subscription
    if (!user) {
      navigate("/login");
      return;
    }

    if (!checkSubscription()) {
      logout();
      navigate("/login");
      return;
    }

    if (!checkDeviceConnected()) {
      logout();
      navigate("/login");
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load continue watching from localStorage
      const continueData = playbackStorage.getContinueWatching();
      setContinueWatching(continueData);
      
      const [bannersData, recentData, popularData, favoritesData, categoriesData, moviesData, seriesData] = await Promise.all([
        bannerApi.getAll(),
        contentApi.getRecent(10),
        contentApi.getMostWatched(10),
        user?.Email ? contentApi.getFavorites(user.Email) : Promise.resolve([]),
        categoryApi.getAll(),
        contentApi.getRecentByType("Filme", 10),
        contentApi.getRecentByType("Serie", 10),
      ]);
      setBanners(bannersData);
      setRecentContent(recentData);
      setPopularContent(popularData);
      setFavorites(favoritesData.slice(0, 10));
      setCategories(categoriesData);
      setRecentMovies(moviesData);
      setRecentSeries(seriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBannerClick = (banner: Banner) => {
    if (banner["Externo?"]) {
      window.open(banner.Link, "_blank");
    } else {
      navigate(`/content/${banner.ID}`);
    }
  };

  const handleContentClick = (content: Content) => {
    navigate(`/content/${content.id}`);
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/browse?category=${encodeURIComponent(category)}`);
  };

  const getCategoryIcon = (name: string) => {
    const iconMap: Record<string, typeof Sword> = {
      "Ação": Sword,
      "Drama": Drama,
      "Comédia": Laugh,
      "Terror": Ghost,
      "Romance": HeartIcon,
      "Ficção Científica": Rocket,
      "Família": Users,
      "Animação": Sparkles,
      "Aventura": Rocket,
      "Suspense": Ghost,
      "Documentário": Film,
    };
    return iconMap[name] || Film;
  };

  const getCategoryGradient = (index: number) => {
    const gradients = [
      "bg-gradient-to-br from-red-500/80 to-orange-600/80",
      "bg-gradient-to-br from-blue-500/80 to-purple-600/80",
      "bg-gradient-to-br from-green-500/80 to-teal-600/80",
      "bg-gradient-to-br from-pink-500/80 to-rose-600/80",
      "bg-gradient-to-br from-amber-500/80 to-yellow-600/80",
      "bg-gradient-to-br from-indigo-500/80 to-blue-600/80",
      "bg-gradient-to-br from-cyan-500/80 to-sky-600/80",
      "bg-gradient-to-br from-violet-500/80 to-purple-600/80",
    ];
    return gradients[index % gradients.length];
  };

  const handleSeeMore = (type: "recent" | "popular" | "favorites" | "movies" | "series") => {
    if (type === "favorites") {
      navigate("/favorites");
    } else if (type === "movies") {
      navigate("/browse?type=Filme&sort=-Data");
    } else if (type === "series") {
      navigate("/browse?type=Serie&sort=-Data");
    } else {
      navigate(`/browse?sort=${type === "recent" ? "-Data" : "-Views"}`);
    }
  };

  const handleContinueWatchingClick = (progress: PlaybackProgress) => {
    if (progress.episodeId) {
      navigate(`/player/${progress.contentId}?type=Serie&season=${progress.season}&episode=${progress.episode}`);
    } else {
      navigate(`/player/${progress.contentId}?type=${progress.contentTipo}`);
    }
  };

  const handleToggleFavorite = async (content: Content, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.Email) return;

    const isFav = contentApi.isFavorite(content.Favoritos, user.Email);
    
    try {
      if (isFav) {
        await contentApi.removeFavorite(content.id, content.Favoritos, user.Email);
        setFavorites((prev) => prev.filter((f) => f.id !== content.id));
        // Update in recent and popular lists
        const updateList = (list: Content[]) =>
          list.map((c) =>
            c.id === content.id
              ? { ...c, Favoritos: (c.Favoritos || "").replace(`{"id":"${user.Email}"}`, "") }
              : c
          );
        setRecentContent(updateList);
        setPopularContent(updateList);
      } else {
        await contentApi.addFavorite(content.id, content.Favoritos, user.Email);
        const updatedContent = { ...content, Favoritos: (content.Favoritos || "") + `{"id":"${user.Email}"}` };
        setFavorites((prev) => [updatedContent, ...prev].slice(0, 10));
        // Update in recent and popular lists
        const updateList = (list: Content[]) =>
          list.map((c) =>
            c.id === content.id
              ? { ...c, Favoritos: (c.Favoritos || "") + `{"id":"${user.Email}"}` }
              : c
          );
        setRecentContent(updateList);
        setPopularContent(updateList);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Sidebar */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-card border-r border-border animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                  <Tv2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">StreamTV</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col p-4 gap-2">
              <Button
                variant="ghost"
                className="justify-start w-full"
                onClick={() => { navigate("/favorites"); setSidebarOpen(false); }}
              >
                <Heart className="w-5 h-5 mr-3" />
                Favoritos
              </Button>
              <Button
                variant="ghost"
                className="justify-start w-full"
                onClick={() => { navigate("/search"); setSidebarOpen(false); }}
              >
                <Search className="w-5 h-5 mr-3" />
                Pesquisar
              </Button>
              <Button
                variant="ghost"
                className="justify-start w-full"
                onClick={() => { navigate("/profile"); setSidebarOpen(false); }}
              >
                <User className="w-5 h-5 mr-3" />
                Perfil
              </Button>
            </nav>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/80 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-1">
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Tv2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:inline">StreamTV</span>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate("/favorites")}
                className="tv-focus"
              >
                <Heart className="w-5 h-5" />
                Favoritos
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate("/search")}
                className="tv-focus"
              >
                <Search className="w-5 h-5" />
                Pesquisar
              </Button>
              {user?.Email && <NotificationBell userEmail={user.Email} />}
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate("/profile")}
                className="tv-focus"
              >
                <User className="w-5 h-5" />
                Perfil
              </Button>
            </nav>
          )}

          {/* Mobile: Only notification bell */}
          {isMobile && user?.Email && <NotificationBell userEmail={user.Email} />}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Banner Carousel */}
        <section className="mb-12">
          <BannerCarousel banners={banners} onBannerClick={handleBannerClick} />
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="px-6 mb-12 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <Film className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Categorias</h2>
            </div>
            <HorizontalScrollList>
              {categories.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  name={category.Nome}
                  icon={getCategoryIcon(category.Nome)}
                  gradient={getCategoryGradient(index)}
                  onClick={() => handleCategoryClick(category.Nome)}
                />
              ))}
            </HorizontalScrollList>
          </section>
        )}

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <section className="px-6 mb-12 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <PlayCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Continuar Assistindo</h2>
            </div>
            <HorizontalScrollList>
              {continueWatching.map((progress) => (
                <ContinueWatchingCard
                  key={`${progress.contentId}-${progress.episodeId || 0}`}
                  progress={progress}
                  onClick={() => handleContinueWatchingClick(progress)}
                />
              ))}
            </HorizontalScrollList>
          </section>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <section className="px-6 mb-12 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Meus Favoritos</h2>
              </div>
              <Button
                variant="ghost"
                onClick={() => handleSeeMore("favorites")}
                className="tv-focus text-muted-foreground hover:text-foreground"
              >
                Ver Mais
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <HorizontalScrollList>
              {favorites.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onClick={() => handleContentClick(content)}
                  isFavorite={true}
                  onToggleFavorite={(e) => handleToggleFavorite(content, e)}
                  size="sm"
                />
              ))}
            </HorizontalScrollList>
          </section>
        )}

        {/* Recent Content */}
        <section className="px-6 mb-12 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Adicionados Recentemente</h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => handleSeeMore("recent")}
              className="tv-focus text-muted-foreground hover:text-foreground"
            >
              Ver Mais
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <HorizontalScrollList>
            {recentContent.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => handleContentClick(content)}
                isFavorite={contentApi.isFavorite(content.Favoritos, user?.Email || "")}
                onToggleFavorite={(e) => handleToggleFavorite(content, e)}
                size="sm"
              />
            ))}
          </HorizontalScrollList>
        </section>

        {/* Popular Content */}
        <section className="px-6 mb-12 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Mais Assistidos</h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => handleSeeMore("popular")}
              className="tv-focus text-muted-foreground hover:text-foreground"
            >
              Ver Mais
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <HorizontalScrollList>
            {popularContent.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => handleContentClick(content)}
                isFavorite={contentApi.isFavorite(content.Favoritos, user?.Email || "")}
                onToggleFavorite={(e) => handleToggleFavorite(content, e)}
                size="sm"
              />
            ))}
          </HorizontalScrollList>
        </section>

        {/* Movies */}
        {recentMovies.length > 0 && (
          <section className="px-6 mb-12 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Film className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Filmes</h2>
              </div>
              <Button
                variant="ghost"
                onClick={() => handleSeeMore("movies")}
                className="tv-focus text-muted-foreground hover:text-foreground"
              >
                Ver Mais
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <HorizontalScrollList>
              {recentMovies.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onClick={() => handleContentClick(content)}
                  isFavorite={contentApi.isFavorite(content.Favoritos, user?.Email || "")}
                  onToggleFavorite={(e) => handleToggleFavorite(content, e)}
                  size="sm"
                />
              ))}
            </HorizontalScrollList>
          </section>
        )}

        {/* Series */}
        {recentSeries.length > 0 && (
          <section className="px-6 mb-12 animate-slide-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Tv className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Séries</h2>
              </div>
              <Button
                variant="ghost"
                onClick={() => handleSeeMore("series")}
                className="tv-focus text-muted-foreground hover:text-foreground"
              >
                Ver Mais
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <HorizontalScrollList>
              {recentSeries.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onClick={() => handleContentClick(content)}
                  isFavorite={contentApi.isFavorite(content.Favoritos, user?.Email || "")}
                  onToggleFavorite={(e) => handleToggleFavorite(content, e)}
                  size="sm"
                />
              ))}
            </HorizontalScrollList>
          </section>
        )}
      </main>

      {/* User Info Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur border-t border-border/50 py-3 px-6 z-40">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Olá, <span className="text-foreground font-medium">{user?.Nome}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">
              Assinatura: <span className="text-primary font-medium">
                {(() => {
                  if (!user?.Restam || !user?.Dias) return "N/A";
                  const match = user.Restam.match(/(\d+)/);
                  if (!match) return "N/A";
                  const restamValue = parseInt(match[1], 10);
                  const diasRestantes = user.Dias - restamValue;
                  return `${diasRestantes > 0 ? diasRestantes : 0} dias restantes`;
                })()}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
