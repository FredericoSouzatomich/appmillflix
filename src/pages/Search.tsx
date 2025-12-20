import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Content, contentApi } from "@/services/baserow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ContentCard from "@/components/ContentCard";
import {
  Search as SearchIcon,
  ArrowLeft,
  Clock,
  TrendingUp,
  X,
  Loader2,
} from "lucide-react";

const SEARCH_HISTORY_KEY = "streamtv_search_history";
const MAX_HISTORY_ITEMS = 10;

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"-Data" | "-Views">("-Data");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Content[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Load search history
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
    
    // Load initial suggestions
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    const popular = await contentApi.getMostWatched(5);
    setSuggestions(popular);
  };

  const saveToHistory = (term: string) => {
    const newHistory = [term, ...searchHistory.filter((h) => h !== term)].slice(
      0,
      MAX_HISTORY_ITEMS
    );
    setSearchHistory(newHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const removeFromHistory = (term: string) => {
    const newHistory = searchHistory.filter((h) => h !== term);
    setSearchHistory(newHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setShowSuggestions(false);
    saveToHistory(searchQuery.trim());

    try {
      const data = await contentApi.search(searchQuery.trim(), sortBy);
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  const handleSuggestionClick = (content: Content) => {
    navigate(`/content/${content.id}`);
  };

  const handleContentClick = (content: Content) => {
    navigate(`/content/${content.id}`);
  };

  const handleSortChange = async (newSort: "-Data" | "-Views") => {
    setSortBy(newSort);
    if (query.trim()) {
      setIsLoading(true);
      try {
        const data = await contentApi.search(query.trim(), newSort);
        setResults(data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }
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

            <div className="flex-1 relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar filmes, séries, canais..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                className="pl-12 h-14 text-lg bg-secondary/50 border-border/50 tv-focus"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <Button
              variant="hero"
              onClick={() => handleSearch()}
              disabled={isLoading}
              className="tv-focus"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SearchIcon className="w-5 h-5" />
              )}
              Pesquisar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Sort Filters */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 mb-8">
            <span className="text-muted-foreground">Ordenar por:</span>
            <Button
              variant={sortBy === "-Data" ? "default" : "outline"}
              onClick={() => handleSortChange("-Data")}
              className="tv-focus"
            >
              <Clock className="w-4 h-4 mr-2" />
              Mais Recentes
            </Button>
            <Button
              variant={sortBy === "-Views" ? "default" : "outline"}
              onClick={() => handleSortChange("-Views")}
              className="tv-focus"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Mais Vistos
            </Button>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {results.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => handleContentClick(content)}
              />
            ))}
          </div>
        ) : query && !showSuggestions ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Nenhum resultado encontrado para "{query}"
            </p>
          </div>
        ) : (
          <>
            {/* Search History */}
            {searchHistory.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Pesquisas Recentes</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="text-muted-foreground hover:text-destructive tv-focus"
                  >
                    Limpar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {searchHistory.map((term, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full group"
                    >
                      <button
                        onClick={() => handleHistoryClick(term)}
                        className="text-foreground hover:text-primary transition-colors tv-focus"
                      >
                        {term}
                      </button>
                      <button
                        onClick={() => removeFromHistory(term)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Suggestions */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Sugestões</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {suggestions.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onClick={() => handleSuggestionClick(content)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Search;
