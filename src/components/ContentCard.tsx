import { Content } from "@/services/baserow";
import { Play, Eye } from "lucide-react";

interface ContentCardProps {
  content: Content;
  onClick: () => void;
}

const ContentCard = ({ content, onClick }: ContentCardProps) => {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-48 group tv-focus rounded-xl overflow-hidden bg-card border border-border/30 hover:border-primary/50 transition-all duration-300"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={content.Capa || "/placeholder.svg"}
          alt={content.Nome}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 rounded-full gradient-hero flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 text-xs font-medium bg-background/80 backdrop-blur rounded-md text-foreground">
            {content.Tipo}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground text-sm truncate mb-1 group-hover:text-primary transition-colors">
          {content.Nome}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{content.Views?.toLocaleString() || 0} views</span>
        </div>
      </div>
    </button>
  );
};

export default ContentCard;
