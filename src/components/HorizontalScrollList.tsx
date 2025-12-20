import { useDragScroll } from "@/hooks/useDragScroll";
import { cn } from "@/lib/utils";

interface HorizontalScrollListProps {
  children: React.ReactNode;
  className?: string;
}

const HorizontalScrollList = ({ children, className }: HorizontalScrollListProps) => {
  const { ref, isDragging, handlers } = useDragScroll<HTMLDivElement>();

  return (
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
  );
};

export default HorizontalScrollList;
