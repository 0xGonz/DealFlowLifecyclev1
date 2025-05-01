import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Deals</DialogTitle>
          <DialogDescription>
            Import multiple deals from a CSV or Excel file.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center text-neutral-600">
          <p>Bulk import functionality is coming soon.</p>
          <p className="mt-2 text-sm">You'll be able to import deals from CSV, Excel, and other formats.</p>
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
