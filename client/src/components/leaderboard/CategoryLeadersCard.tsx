import { CategoryLeader } from "@/lib/types";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

interface CategoryLeadersCardProps {
  categories: CategoryLeader[];
}

export default function CategoryLeadersCard({ categories }: CategoryLeadersCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base sm:text-lg">Category Leaders</CardTitle>
          <Trophy className="h-5 w-5 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.categoryId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-7 w-7" style={{ backgroundColor: category.user.avatarColor }}>
                  <AvatarFallback className="text-xs">{category.user.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{category.user.fullName}</div>
                  <div className="text-xs text-gray-500">{category.categoryName}</div>
                </div>
              </div>
              <div className="text-sm font-semibold">{category.count}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}