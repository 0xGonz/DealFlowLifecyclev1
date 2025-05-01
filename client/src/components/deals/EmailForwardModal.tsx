import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailForwardModal({ isOpen, onClose }: EmailForwardModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Forward Email to Deal Inbox</DialogTitle>
          <DialogDescription>
            Forward deal-related emails to be automatically processed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center text-neutral-600">
          <p>Email forwarding functionality is coming soon.</p>
          <p className="mt-2 text-sm">You'll be able to forward emails to a dedicated address for automatic deal processing.</p>
          <div className="mt-4 p-3 bg-neutral-100 rounded text-sm">
            <p className="font-medium">Your future forwarding address:</p>
            <Input 
              value="deals@doliver.example.com" 
              readOnly 
              className="mt-2 text-center bg-white" 
            />
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
