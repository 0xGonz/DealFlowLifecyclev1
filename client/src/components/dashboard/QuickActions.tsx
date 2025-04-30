import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Upload,
  FileText,
  PlusCircle,
  SendHorizontal
} from "lucide-react";

export default function QuickActions() {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    // In a production app, these would trigger specific actions
    // For now, we'll just show a toast notification
    toast({
      title: "Action triggered",
      description: `${action} action was clicked`
    });
  };

  const actions = [
    {
      icon: <SendHorizontal className="h-5 w-5 mr-2 text-primary" />,
      label: "Forward Email to Deal Inbox",
      action: "forward-email"
    },
    {
      icon: <PlusCircle className="h-5 w-5 mr-2 text-primary" />,
      label: "Manual Deal Entry",
      action: "manual-entry"
    },
    {
      icon: <Upload className="h-5 w-5 mr-2 text-primary" />,
      label: "Bulk Import Deals",
      action: "bulk-import"
    },
    {
      icon: <FileText className="h-5 w-5 mr-2 text-primary" />,
      label: "Generate Portfolio Report",
      action: "generate-report"
    },
    {
      icon: <Copy className="h-5 w-5 mr-2 text-primary" />,
      label: "Compose Mini-Memo",
      action: "compose-memo"
    }
  ];

  return (
    <Card className="bg-white p-4 rounded-lg shadow h-full">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2">
          {actions.map((item) => (
            <button
              key={item.action}
              className="block w-full p-2 rounded hover:bg-neutral-100 text-sm flex items-center text-left"
              onClick={() => handleAction(item.action)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
