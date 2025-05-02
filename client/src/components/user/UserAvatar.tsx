import { User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserAvatarProps = {
  user: User;
  className?: string;
};

export function UserAvatar({ user, className }: UserAvatarProps) {
  // Generate initials from the user's full name
  const initials = user.fullName
    .split(" ")
    .map(name => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Use the user's avatar color if available, or generate a default color
  const avatarColor = user.avatarColor || generateDefaultColor(user.id);

  return (
    <Avatar className={className}>
      <AvatarFallback 
        className="text-white" 
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// Generate consistent colors based on user ID
function generateDefaultColor(userId: number): string {
  const colors = [
    "#f97316", // orange-500
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
    "#a855f7", // purple-500
    "#ec4899", // pink-500
    "#f43f5e", // rose-500
    "#06b6d4", // cyan-500
    "#14b8a6", // teal-500
    "#8b5cf6", // violet-500
    "#d946ef", // fuchsia-500
  ];
  
  // Use modulo to get a consistent color for each user ID
  return colors[userId % colors.length];
}
