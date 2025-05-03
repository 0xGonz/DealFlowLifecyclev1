import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentRole: string;
}

export default function ProfileEditModal({ 
  isOpen, 
  onClose,
  currentName,
  currentRole
}: ProfileEditModalProps) {
  const [name, setName] = useState(currentName);
  const [role, setRole] = useState(currentRole);
  
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleSubmit = async () => {
    if (!name?.trim()) {
      toast({
        title: "Error", 
        description: "Name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      // In a production app, this would update the actual user profile
      // using a proper API endpoint
      console.log("Profile updated:", { name, role });
      
      // For this demo, we'll update the first user in the database
      await apiRequest("PATCH", "/api/users/1", {
        fullName: name,
        role: role
      });
      
      // Refresh user data and timeline events
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] }),
        // Invalidate all timeline data
        queryClient.invalidateQueries({ queryKey: ["/api/deals/1/timeline"] })
      ]);
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="observer">Observer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="permissions" className="text-right">
              Permissions
            </Label>
            <div className="col-span-3 text-sm text-neutral-600">
              {role === 'admin' && 'Full system access, including user management'}
              {role === 'partner' && 'Create/edit deals, approve investments, view all content'}
              {role === 'analyst' && 'Create/edit deals, view all content, suggest investments'}
              {role === 'observer' && 'View-only access to deals and content'}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary-dark text-white">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
