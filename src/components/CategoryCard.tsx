import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  name: string;
  icon: LucideIcon;
  gradient: string;
  onClick: () => void;
}

const CategoryCard = ({ name, icon: Icon, gradient, onClick }: CategoryCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`tv-focus flex-shrink-0 w-36 h-24 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-105 ${gradient}`}
    >
      <Icon className="w-8 h-8 text-primary-foreground" />
      <span className="text-sm font-semibold text-primary-foreground">{name}</span>
    </button>
  );
};

export default CategoryCard;
