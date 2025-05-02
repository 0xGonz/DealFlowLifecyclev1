import React, { useState } from 'react';
import { User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "./UserAvatar";
import { useAuth } from "@/hooks/use-auth";

const AVATAR_COLORS = [
  { name: "Blue", value: "blue-600" },
  { name: "Green", value: "emerald-600" },
  { name: "Purple", value: "violet-600" },
  { name: "Rose", value: "rose-600" },
  { name: "Orange", value: "orange-600" },
  { name: "Teal", value: "teal-600" },
  { name: "Red", value: "red-600" },
  { name: "Gray", value: "neutral-600" },
];

interface ProfileFormData {
  fullName: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface EditProfileDialogProps {
  trigger: React.ReactNode;
}

export default function EditProfileDialog({ trigger }: EditProfileDialogProps) {
  const { user, mutateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    role: user?.role || 'analyst',
    avatarColor: user?.avatarColor || 'blue-600',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Calculate initials from full name
      const nameParts = formData.fullName.split(' ');
      const initials = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}` 
        : formData.fullName.substring(0, 2);
      
      // Update user profile
      const updatedUser = await apiRequest('PATCH', `/api/users/${user.id}`, {
        ...formData,
        initials: initials.toUpperCase()
      });
      
      // Update auth context and invalidate queries
      await mutateUser();
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor || 'blue-600',
      });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar user={{
              ...user as User,
              avatarColor: formData.avatarColor
            }} size="lg" />
            
            <div>
              <p className="text-sm font-medium mb-1">{formData.fullName}</p>
              <Label htmlFor="avatarColor" className="text-xs text-neutral-500 mb-2">Avatar Color</Label>
              <Select 
                value={formData.avatarColor} 
                onValueChange={(value) => setFormData({...formData, avatarColor: value})}
              >
                <SelectTrigger id="avatarColor" className="w-[120px]">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {AVATAR_COLORS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center">
                        <div className={`h-3 w-3 rounded-full bg-${color.value} mr-2`}></div>
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({...formData, role: value})}
                disabled={user?.role !== 'admin'} // Only admins can change roles
              >
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="observer">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
