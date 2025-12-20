import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Banner, Content, bannerApi, contentApi } from "@/services/baserow";
import { Button } from "@/components/ui/button";
import { Play, ChevronRight, Search, LogOut, Tv2, Clock, TrendingUp } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import BannerCarousel from "@/components/BannerCarousel";

const Home = () => {
  const { user, logout, checkSubscription, checkDeviceConnected } = useAuth();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [recentContent, setRecentContent] = useState<Content[]>([]);
  const [popularContent, setPopularContent] = useState<Content[]>([]);
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
      const [bannersData, recentData, popularData] = await Promise.all([
        bannerApi.getAll(),
        contentApi.getRecent(10),
        contentApi.getMostWatched(10),
      ]);
      setBanners(bannersData);
      setRecentContent(recentData);
      setPopularContent(popularData);
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

  const handleSeeMore = (type: "recent" | "popular") => {
    navigate(`/browse?sort=${type === "recent" ? "-Data" : "-Views"}`);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/80 to-transparent">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Tv2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">StreamTV</span>
          </div>

          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate("/search")}
              className="tv-focus"
            >
              <Search className="w-5 h-5" />
              Pesquisar
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleLogout}
              className="tv-focus text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Banner Carousel */}
        <section className="mb-12">
          <BannerCarousel banners={banners} onBannerClick={handleBannerClick} />
        </section>

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
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {recentContent.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => handleContentClick(content)}
              />
            ))}
          </div>
        </section>

        {/* Popular Content */}
        <section className="px-6 mb-12 animate-slide-up" style={{ animationDelay: "0.4s" }}>
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
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {popularContent.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => handleContentClick(content)}
              />
            ))}
          </div>
        </section>

        {/* User Info Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur border-t border-border/50 py-3 px-6">
          <div className="container mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Olá, <span className="text-foreground font-medium">{user?.Nome}</span>
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Assinatura: <span className="text-primary font-medium">{user?.Restam}</span>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
