import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

interface UserAvatarProps {
  user: UserWithoutPassword;
  className?: string;
}

/**
 * Avatar component that displays initials with a colored background
 */
export default function UserAvatar({ user, className }: UserAvatarProps) {
  // Use the user's preferred avatar color or generate one based on user ID
  const avatarColor = user.avatarColor || generateColorFromId(user.id);
  
  return (
    <Avatar className={cn(className)}>
      <AvatarFallback 
        style={{ backgroundColor: avatarColor }}
        className="text-white font-medium"
      >
        {user.initials}
      </AvatarFallback>
    </Avatar>
  );
}

// List of nice avatar colors
const avatarColors = [
  "#2563eb", // blue-600
  "#9333ea", // purple-600
  "#c026d3", // fuchsia-600
  "#e11d48", // rose-600
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#ca8a04", // yellow-600
  "#16a34a", // green-600
  "#0891b2", // cyan-600
  "#4f46e5", // indigo-600
];

/**
 * Generate a consistent color based on user ID
 */
function generateColorFromId(id: number): string {
  return avatarColors[id % avatarColors.length];
}
