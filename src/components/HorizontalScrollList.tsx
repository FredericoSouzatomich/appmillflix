import { useDragScroll } from "@/hooks/useDragScroll";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface HorizontalScrollListProps {
  children: React.ReactNode;
  className?: string;
}

const HorizontalScrollList = ({ children, className }: HorizontalScrollListProps) => {
  const { ref, isDragging, handlers } = useDragScroll<HTMLDivElement>();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!ref.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, [ref]);

  useEffect(() => {
    checkScroll();
    const element = ref.current;
    if (element) {
      element.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        element.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [checkScroll, ref]);

  const scroll = (direction: "left" | "right") => {
    if (!ref.current) return;
    const scrollAmount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
      )}
      
      <div
        ref={ref}
        {...handlers}
        className={cn(
          "flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide",
          isDragging && "cursor-grabbing select-none",
          !isDragging && "cursor-grab",
          className
        )}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      )}
    </div>
  );
};

export default HorizontalScrollList;
