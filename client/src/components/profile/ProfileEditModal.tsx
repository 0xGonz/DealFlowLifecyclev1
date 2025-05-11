import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { FORM_CONSTRAINTS, TOAST_DURATION, USER_ROLE_DESCRIPTIONS, AVATAR_COLORS } from "@/lib/constants/ui-constants";
import { UserAvatar } from "@/components/common/UserAvatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  interface User {
    id: number;
    username: string;
    fullName: string;
    initials: string;
    role: string;
    avatarColor?: string | null;
  }

  // Get current user to determine ID for update
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Sync props with state when they change
  useEffect(() => {
    setName(currentName);
    setRole(currentRole);
    
    if (currentUser?.avatarColor) {
      setAvatarColor(currentUser.avatarColor);
    } else {
      setAvatarColor(AVATAR_COLORS.DEFAULT);
    }
  }, [currentName, currentRole, currentUser]);

  const handleSubmit = async () => {
    if (!name?.trim() || name.length < FORM_CONSTRAINTS.USERNAME.MIN_LENGTH) {
      toast({
        title: "Error", 
        description: FORM_CONSTRAINTS.USERNAME.ERROR_MESSAGE,
        variant: "destructive",
        duration: TOAST_DURATION.MEDIUM
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      // Determine the user ID to update
      // If authenticated, use the current user's ID, otherwise default to 1
      const userId = (currentUser && 'id' in currentUser) ? currentUser.id : 1;
      
      // Update the user
      await apiRequest("PATCH", `/api/users/${userId}`, {
        fullName: name,
        role: role,
        avatarColor: avatarColor
      });
      
      // Refresh user data and timeline events
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] }),
        // Invalidate all timeline data for all deals
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] }),
      ]);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
        duration: TOAST_DURATION.SHORT
      });
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
        duration: TOAST_DURATION.LONG
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
        
        {/* Avatar Preview */}
        <div className="flex justify-center mb-4">
          {currentUser && (
            <div className="flex flex-col items-center">
              <UserAvatar 
                user={{
                  ...currentUser,
                  avatarColor: avatarColor
                }} 
                size="lg"
              />
              <span className="text-sm text-muted-foreground mt-2">Avatar Preview</span>
            </div>
          )}
        </div>
        
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
              maxLength={FORM_CONSTRAINTS.USERNAME.MAX_LENGTH}
              placeholder={FORM_CONSTRAINTS.PLACEHOLDERS.ENTER_NAME}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={FORM_CONSTRAINTS.PLACEHOLDERS.SELECT_ROLE} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="observer">Observer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
              Avatar Color
            </Label>
            <div className="col-span-3">
              <RadioGroup
                value={avatarColor || AVATAR_COLORS.DEFAULT}
                onValueChange={setAvatarColor}
                className="grid grid-cols-4 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.BLUE} 
                    id="color-blue" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.BLUE }}
                  />
                  <Label htmlFor="color-blue">Blue</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.RED} 
                    id="color-red" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.RED }}
                  />
                  <Label htmlFor="color-red">Red</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.GREEN} 
                    id="color-green" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.GREEN }}
                  />
                  <Label htmlFor="color-green">Green</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.PURPLE} 
                    id="color-purple" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.PURPLE }}
                  />
                  <Label htmlFor="color-purple">Purple</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.ORANGE} 
                    id="color-orange" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.ORANGE }}
                  />
                  <Label htmlFor="color-orange">Orange</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.TEAL} 
                    id="color-teal" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.TEAL }}
                  />
                  <Label htmlFor="color-teal">Teal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.PINK} 
                    id="color-pink" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.PINK }}
                  />
                  <Label htmlFor="color-pink">Pink</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={AVATAR_COLORS.INDIGO} 
                    id="color-indigo" 
                    className="border-2"
                    style={{ backgroundColor: AVATAR_COLORS.INDIGO }}
                  />
                  <Label htmlFor="color-indigo">Indigo</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="permissions" className="text-right">
              Permissions
            </Label>
            <div className="col-span-3 text-sm text-neutral-600">
              {role === 'admin' && USER_ROLE_DESCRIPTIONS.ADMIN}
              {role === 'partner' && USER_ROLE_DESCRIPTIONS.PARTNER}
              {role === 'analyst' && USER_ROLE_DESCRIPTIONS.ANALYST}
              {role === 'observer' && USER_ROLE_DESCRIPTIONS.OBSERVER}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary-dark text-white" disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
