import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, BarChart2, FileSpreadsheet } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const reportTypes = [
    {
      title: "Portfolio Overview",
      description: "Complete summary of all investments",
      icon: <FileText className="h-6 w-6 text-primary" />
    },
    {
      title: "Performance Analysis",
      description: "Detailed performance metrics and trends",
      icon: <BarChart2 className="h-6 w-6 text-primary" />
    },
    {
      title: "Sector Distribution",
      description: "Investment breakdown by sector and industry",
      icon: <FileSpreadsheet className="h-6 w-6 text-primary" />
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Generate Portfolio Report</DialogTitle>
          <DialogDescription>
            Create comprehensive reports of your investment portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-center mb-4 text-neutral-600">Report generation functionality is coming soon.</p>
          
          <div className="space-y-3">
            {reportTypes.map((report, index) => (
              <div key={index} className="p-3 border rounded-lg flex items-center">
                <div className="mr-3">
                  {report.icon}
                </div>
                <div>
                  <h4 className="font-medium">{report.title}</h4>
                  <p className="text-sm text-neutral-500">{report.description}</p>
                </div>
                <Button className="ml-auto" variant="outline" disabled>
                  Generate
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
