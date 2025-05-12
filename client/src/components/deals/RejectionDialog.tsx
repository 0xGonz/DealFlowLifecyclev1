import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  const handleConfirm = () => {
    if (rejectionReason.trim() === "") {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this deal.",
        variant: "destructive"
      });
      return;
    }
    
    onConfirm(rejectionReason);
    setRejectionReason(""); // Reset for next use
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject {dealName || 'Deal'}</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for rejecting this deal. This information will be tracked and visible to the team.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter rejection reason..."
          className="min-h-[100px]"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className="bg-destructive hover:bg-destructive/90"
          >
            Reject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}