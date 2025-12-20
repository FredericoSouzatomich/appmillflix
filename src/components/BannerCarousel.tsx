import { useState, useEffect, useRef } from "react";
import { Banner } from "@/services/baserow";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface BannerCarouselProps {
  banners: Banner[];
  onBannerClick: (banner: Banner) => void;
}

const BannerCarousel = ({ banners, onBannerClick }: BannerCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAutoPlaying && banners.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 6000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, banners.length]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  if (banners.length === 0) {
    return (
      <div className="h-[500px] bg-card flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum destaque disponível</p>
      </div>
    );
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Slides */}
      <div className="absolute inset-0">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-700 ${
              index === currentIndex
                ? "opacity-100 scale-100"
                : "opacity-0 scale-105"
            }`}
          >
            <img
              src={banner.Imagem || "/placeholder.svg"}
              alt={banner.Nome}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl animate-fade-in" key={currentIndex}>
            {currentBanner.Categoria && (
              <span className="inline-block px-3 py-1 mb-4 text-sm font-medium bg-primary/20 text-primary rounded-full">
                {currentBanner.Categoria}
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 text-shadow">
              {currentBanner.Nome}
            </h1>
            <div className="flex gap-4 mt-8">
              <Button
                size="xl"
                variant="hero"
                onClick={() => onBannerClick(currentBanner)}
                className="tv-focus"
              >
                {currentBanner["Externo?"] ? (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Acessar
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" fill="currentColor" />
                    Assistir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/50 backdrop-blur border border-border/50 flex items-center justify-center text-foreground hover:bg-background/80 hover:border-primary transition-all duration-300 tv-focus"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/50 backdrop-blur border border-border/50 flex items-center justify-center text-foreground hover:bg-background/80 hover:border-primary transition-all duration-300 tv-focus"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 tv-focus ${
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-foreground/30 hover:bg-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
