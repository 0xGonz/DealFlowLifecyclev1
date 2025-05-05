import { Star } from "lucide-react";

interface DealStarProps {
  count: number;
  filled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showCount?: boolean;
  className?: string;
}

export default function DealStar({
  count,
  filled = false,
  size = 'md',
  onClick,
  showCount = true,
  className = ''
}: DealStarProps) {
  const isFilled = filled || count > 0;
  
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };
  
  return (
    <div 
      className={`flex items-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <Star 
        className={`${sizeClasses[size]} ${isFilled ? 'fill-accent text-accent' : 'text-neutral-400'} ${onClick ? 'mr-1' : ''}`} 
      />
      {showCount && count > 0 && (
        <span className="text-xs text-neutral-600">{count}</span>
      )}
    </div>
  );
}
