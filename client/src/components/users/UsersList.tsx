import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone } from "lucide-react";

interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor?: string | null;
}

const roleBadgeColors = {
  admin: "bg-red-100 text-red-800 hover:bg-red-200",
  partner: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  analyst: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  observer: "bg-gray-100 text-gray-800 hover:bg-gray-200",
};

export default function UsersList() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>View and interact with your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center p-4 border rounded-lg"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>View and interact with your team</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center">
                <Avatar className="h-12 w-12">
                  <AvatarFallback
                    style={{ backgroundColor: user.avatarColor || "#0E4DA4" }}
                    className="text-white"
                  >
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4">
                  <h3 className="text-base font-medium">{user.fullName}</h3>
                  <div className="flex items-center mt-1">
                    <Badge
                      variant="secondary"
                      className={`${roleBadgeColors[user.role as keyof typeof roleBadgeColors]} mr-2 capitalize`}
                    >
                      {user.role}
                    </Badge>
                    <span className="text-sm text-gray-500">@{user.username}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center mt-4 sm:mt-0">
                <a
                  href={`mailto:${user.email}`}
                  className="text-gray-500 hover:text-gray-700 mr-4"
                >
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
