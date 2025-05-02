import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import UserAvatar from "./UserAvatar";
import { X } from "lucide-react";

interface EditProfileDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Form schema for profile updates
const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "partner", "analyst", "observer"]),
  avatarColor: z.string().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Color options for avatar
const colorOptions = [
  { value: "#2563eb", label: "Blue" },
  { value: "#9333ea", label: "Purple" },
  { value: "#c026d3", label: "Fuchsia" },
  { value: "#e11d48", label: "Rose" },
  { value: "#dc2626", label: "Red" },
  { value: "#ea580c", label: "Orange" },
  { value: "#ca8a04", label: "Yellow" },
  { value: "#16a34a", label: "Green" },
  { value: "#0891b2", label: "Cyan" },
  { value: "#4f46e5", label: "Indigo" },
];

export default function EditProfileDialog({
  trigger,
  open,
  onOpenChange,
}: EditProfileDialogProps) {
  const { user, updateProfileMutation = { isPending: false, mutateAsync: async () => ({} as any) } } = useAuth();
  const [selectedColor, setSelectedColor] = useState<string | null>(
    user?.avatarColor || null
  );

  // Form handling
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      role: user?.role || "analyst",
      avatarColor: user?.avatarColor,
    },
  });

  // Preview user with selected color
  const previewUser = user
    ? {
        ...user,
        avatarColor: selectedColor,
      }
    : null;

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    await updateProfileMutation.mutateAsync({
      userId: user.id,
      data,
    });
    
    // Close dialog if onOpenChange is provided
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
    // Reset form to original values
    reset({
      fullName: user?.fullName || "",
      email: user?.email || "",
      role: user?.role || "analyst",
      avatarColor: user?.avatarColor,
    });
    setSelectedColor(user?.avatarColor || null);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Avatar preview */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative">
              {previewUser && (
                <UserAvatar user={previewUser} className="h-20 w-20" />
              )}
              {selectedColor && (
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                  onClick={() => {
                    setSelectedColor(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="text-lg font-medium mt-2">{user.fullName}</div>
            <div className="text-sm text-gray-500">{user.username}</div>

            {/* Color selector */}
            <div className="flex gap-1 mt-3 flex-wrap max-w-[240px] justify-center">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  style={{ backgroundColor: color.value }}
                  onClick={() => {
                    setSelectedColor(color.value);
                  }}
                  title={color.label}
                  aria-label={`Select ${color.label} color`}
                />
              ))
              }
            </div>
            <input 
              type="hidden" 
              {...register("avatarColor")} 
              value={selectedColor || ""} 
            />
          </div>

          {/* Form fields */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-sm text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="observer">Observer</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || updateProfileMutation.isPending}>
              {isSubmitting || updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
