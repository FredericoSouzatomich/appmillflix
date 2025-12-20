import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Content, contentApi } from "@/services/baserow";
import { Button } from "@/components/ui/button";
import ContentCard from "@/components/ContentCard";
import { ArrowLeft, Clock, TrendingUp, Grid, Loader2, Film, Tv, Filter, ChevronLeft, ChevronRight } from "lucide-react";

type SortOption = "-Data" | "-Views";
type TypeOption = "" | "Filme" | "Serie";

const ITEMS_PER_PAGE = 24;

const Browse = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const sortParam = searchParams.get("sort") || "-Data";
  const categoryParam = searchParams.get("category") || "";
  const typeParam = searchParams.get("type") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [contents, setContents] = useState<Content[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedType, setSelectedType] = useState<TypeOption>(typeParam as TypeOption);
  const [sortBy, setSortBy] = useState<SortOption>(sortParam as SortOption);
  const [currentPage, setCurrentPage] = useState(pageParam);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategoriesFromContents();
  }, []);

  useEffect(() => {
    loadContents();
  }, [selectedCategory, selectedType, sortBy, currentPage]);

  const loadCategoriesFromContents = async () => {
    try {
      const allContents = await contentApi.getAll();
      const allCategories = new Set<string>();
      
      allContents.forEach((content) => {
        if (content.Categoria) {
          const cats = content.Categoria.split(",").map((c) => c.trim()).filter(Boolean);
          cats.forEach((cat) => allCategories.add(cat));
        }
      });
      
      setCategories(Array.from(allCategories).sort());
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
      } else if (selectedType) {
        data = await contentApi.getByType(selectedType);
        if (sortBy === "-Data") {
          data.sort((a, b) => new Date(b.Data).getTime() - new Date(a.Data).getTime());
        } else {
          data.sort((a, b) => (b.Views || 0) - (a.Views || 0));
        }
      } else {
        data = await contentApi.getAll(sortBy);
      }
      
      if (selectedCategory && selectedType) {
        data = data.filter((c) => c.Tipo === selectedType);
      }
      
      setContents(data);
    } catch (error) {
      console.error("Error loading contents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateURL = (category: string, type: TypeOption, sort: SortOption, page: number = 1) => {
    const params = new URLSearchParams();
    params.set("sort", sort);
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (page > 1) params.set("page", page.toString());
    navigate(`/browse?${params.toString()}`);
  };

  const totalPages = Math.ceil(contents.length / ITEMS_PER_PAGE);
  const paginatedContents = contents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleContentClick = (content: Content) => {
    navigate(`/content/${content.id}`);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    updateURL(category, selectedType, sortBy, 1);
  };

  const handleTypeChange = (type: TypeOption) => {
    setSelectedType(type);
    setCurrentPage(1);
    updateURL(selectedCategory, type, sortBy, 1);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    updateURL(selectedCategory, selectedType, newSort, 1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL(selectedCategory, selectedType, sortBy, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getTitle = () => {
    const parts: string[] = [];
    
    if (selectedType === "Filme") parts.push("Filmes");
    else if (selectedType === "Serie") parts.push("Séries");
    
    if (selectedCategory) parts.push(selectedCategory);
    
    if (parts.length === 0) {
      return sortBy === "-Data" ? "Adicionados Recentemente" : "Mais Assistidos";
    }
    
    return parts.join(" - ");
  };

  const activeFiltersCount = [selectedCategory, selectedType].filter(Boolean).length;

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
            {activeFiltersCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""}
              </span>
            )}
            <Button variant="ghost" onClick={() => navigate("/search")} className="tv-focus">
              Pesquisar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8 p-4 bg-card/50 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
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

            <div className="w-px h-6 bg-border hidden md:block" />

            {/* Type Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Tipo:</span>
              <Button
                variant={!selectedType ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeChange("")}
                className="tv-focus"
              >
                <Grid className="w-4 h-4 mr-1" />
                Todos
              </Button>
              <Button
                variant={selectedType === "Filme" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeChange("Filme")}
                className="tv-focus"
              >
                <Film className="w-4 h-4 mr-1" />
                Filmes
              </Button>
              <Button
                variant={selectedType === "Serie" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeChange("Serie")}
                className="tv-focus"
              >
                <Tv className="w-4 h-4 mr-1" />
                Séries
              </Button>
            </div>
          </div>

          {/* Category Buttons with horizontal scroll */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm shrink-0">Categoria:</span>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange("")}
                className="tv-focus shrink-0"
              >
                Todas
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryChange(category)}
                  className="tv-focus shrink-0"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && (
          <p className="text-muted-foreground text-sm mb-6">
            {contents.length} resultado{contents.length !== 1 ? "s" : ""} encontrado{contents.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : paginatedContents.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {paginatedContents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onClick={() => handleContentClick(content)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="tv-focus"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, arr) => {
                      const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="tv-focus min-w-[40px]"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="tv-focus"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Nenhum conteúdo encontrado
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSelectedCategory("");
                setSelectedType("");
                setCurrentPage(1);
                updateURL("", "", sortBy, 1);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Browse;
