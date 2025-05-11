import React from "react";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  fullName: string;
  username: string;
}

interface DeleteUserAlertProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function DeleteUserAlert({ isOpen, onClose, user }: DeleteUserAlertProps) {
  const { toast } = useToast();
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted successfully",
        description: "The user account has been permanently removed",
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive"
      });
      onClose();
    }
  });
  
  // Confirm delete user
  const confirmDeleteUser = () => {
    if (user) {
      deleteUserMutation.mutate(user.id);
    }
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete the user account for{" "}
            <span className="font-medium">{user?.fullName || ""}</span> (@{user?.username || ""}).
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmDeleteUser}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}