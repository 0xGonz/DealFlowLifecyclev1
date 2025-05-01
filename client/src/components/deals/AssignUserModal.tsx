import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/lib/types";

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: number;
}

export default function AssignUserModal({ isOpen, onClose, dealId }: AssignUserModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });
  
  // Fetch current assignments
  const { data: dealData } = useQuery({
    queryKey: [`/api/deals/${dealId}`],
    enabled: isOpen && !!dealId,
  });
  
  // Pre-select currently assigned users
  useState(() => {
    if (dealData?.assignedUsers) {
      setSelectedUsers(dealData.assignedUsers.map((user: any) => user.id));
    }
  }, [dealData]);
  
  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/deals/${dealId}/assignments`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign user. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Unassign user mutation
  const unassignUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/deals/${dealId}/assignments/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unassign user. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const toggleUserSelection = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      // Remove user from selection and unassign if already assigned
      const currentAssignedIds = dealData?.assignedUsers?.map((u: any) => u.id) || [];
      if (currentAssignedIds.includes(userId)) {
        unassignUserMutation.mutate(userId);
      }
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      // Add user to selection and assign if not already assigned
      const currentAssignedIds = dealData?.assignedUsers?.map((u: any) => u.id) || [];
      if (!currentAssignedIds.includes(userId)) {
        assignUserMutation.mutate(userId);
      }
      setSelectedUsers(prev => [...prev, userId]);
    }
  };
  
  const handleSave = () => {
    // Everything is already saved in real-time
    toast({
      title: "Success",
      description: "User assignments updated successfully."
    });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Users to Deal</DialogTitle>
          <DialogDescription>
            Select team members to assign to this deal.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4 max-h-[300px] overflow-y-auto">
          {isLoadingUsers ? (
            <div className="py-4 text-center text-neutral-500">Loading users...</div>
          ) : (
            users?.map(user => (
              <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-neutral-100 rounded-md">
                <Checkbox
                  id={`user-${user.id}`}
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={() => toggleUserSelection(user.id)}
                />
                <div className="flex items-center space-x-3 flex-1">
                  <Avatar>
                    <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {users?.length === 0 && (
            <div className="py-4 text-center text-neutral-500">No users found</div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}