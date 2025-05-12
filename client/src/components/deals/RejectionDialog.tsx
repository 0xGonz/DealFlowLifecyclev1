import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';

interface RejectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  dealName?: string;
}

export default function RejectionDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm,
  dealName
}: RejectionDialogProps) {
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Reset rejection reason when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log("RejectionDialog opened for deal:", dealName);
      setRejectionReason(""); // Clear previous reason
    }
  }, [isOpen, dealName]);

  const handleConfirm = () => {
    if (rejectionReason.trim() === "") {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this deal.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Submitting rejection with reason:", rejectionReason);
    onConfirm(rejectionReason);
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log("Dialog changing open state to:", open);
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-destructive">
            Reject {dealName || 'Deal'}
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this deal. This information will be tracked and visible to the team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="min-h-[100px]"
            autoFocus
          />
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              console.log("Cancel button clicked");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              console.log("Confirm button clicked with reason:", rejectionReason);
              handleConfirm();
            }}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}