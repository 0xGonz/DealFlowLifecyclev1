import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: Pick<User, "fullName" | "initials" | "avatarColor"> | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const getSize = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8 text-xs";
      case "lg":
        return "h-12 w-12 text-lg";
      default:
        return "h-10 w-10 text-sm";
    }
  };

  const getBgColor = () => {
    if (!user?.avatarColor) return "bg-primary";
    return `bg-${user.avatarColor}`;
  };

  return (
    <Avatar className={cn(getSize(), className)}>
      <AvatarFallback
        className={cn(
          "font-medium text-white",
          getBgColor()
        )}
      >
        {user?.initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
