import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Content, Category, contentApi, categoryApi } from "@/services/baserow";
import { Button } from "@/components/ui/button";
import ContentCard from "@/components/ContentCard";
import { ArrowLeft, Clock, TrendingUp, Grid, Loader2 } from "lucide-react";

const Browse = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const sortParam = searchParams.get("sort") || "-Data";
  const categoryParam = searchParams.get("category") || "";

  const [contents, setContents] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState<"-Data" | "-Views">(sortParam as "-Data" | "-Views");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadContents();
  }, [selectedCategory, sortBy]);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadContents = async () => {
    try {
      setIsLoading(true);
      let data: Content[];
      
      if (selectedCategory) {
        data = await contentApi.getByCategory(selectedCategory, sortBy);
      } else {
        data = await contentApi.getAll(sortBy);
      }
      
      setContents(data);
    } catch (error) {
      console.error("Error loading contents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentClick = (content: Content) => {
    navigate(`/content/${content.id}`);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    navigate(`/browse?sort=${sortBy}${category ? `&category=${category}` : ""}`);
  };

  const handleSortChange = (newSort: "-Data" | "-Views") => {
    setSortBy(newSort);
    navigate(`/browse?sort=${newSort}${selectedCategory ? `&category=${selectedCategory}` : ""}`);
  };

  const getTitle = () => {
    if (selectedCategory) {
      return selectedCategory;
    }
    return sortBy === "-Data" ? "Adicionados Recentemente" : "Mais Assistidos";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="tv-focus">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex-1">{getTitle()}</h1>
            <Button variant="ghost" onClick={() => navigate("/search")} className="tv-focus">
              Pesquisar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {/* Sort Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Ordenar:</span>
            <Button
              variant={sortBy === "-Data" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("-Data")}
              className="tv-focus"
            >
              <Clock className="w-4 h-4 mr-1" />
              Recentes
            </Button>
            <Button
              variant={sortBy === "-Views" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("-Views")}
              className="tv-focus"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Populares
            </Button>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Category Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground text-sm">Categoria:</span>
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange("")}
              className="tv-focus"
            >
              <Grid className="w-4 h-4 mr-1" />
              Todas
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.Nome ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category.Nome)}
                className="tv-focus"
              >
                {category.Nome}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : contents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {contents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => handleContentClick(content)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Nenhum conteúdo encontrado
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Browse;
