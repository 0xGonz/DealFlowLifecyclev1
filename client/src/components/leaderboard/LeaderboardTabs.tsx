import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, BarChart2 } from "lucide-react";

interface LeaderboardTabsProps {
  activeTab: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

export default function LeaderboardTabs({ activeTab, onChange, children }: LeaderboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onChange} className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Diligence Leaderboard</h2>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            <span>Team Rankings</span>
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-1">
            <BarChart2 className="h-4 w-4" />
            <span>Deal Activity</span>
          </TabsTrigger>
        </TabsList>
      </div>
      
      {children}
    </Tabs>
  );
}