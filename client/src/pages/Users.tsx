import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, UserPlus, Search, Mail, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AVATAR_COLORS } from "@/lib/constants/ui-constants";
import { apiRequest } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Dummy data for users
const MOCK_USERS = [
  {
    id: 1,
    fullName: "Admin User",
    username: "admin",
    email: "admin@example.com",
    role: "admin",
    initials: "AU",
    avatarColor: "#4f46e5",
    lastActive: "2023-05-15T12:30:00Z"
  },
  {
    id: 2,
    fullName: "John Partner",
    username: "johnp",
    email: "john@example.com",
    role: "partner",
    initials: "JP",
    avatarColor: "#0ea5e9",
    lastActive: "2023-05-14T15:45:00Z"
  },
  {
    id: 3,
    fullName: "Alice Analyst",
    username: "alicea",
    email: "alice@example.com",
    role: "analyst",
    initials: "AA",
    avatarColor: "#10b981",
    lastActive: "2023-05-15T09:15:00Z"
  },
  {
    id: 4,
    fullName: "Bob Observer",
    username: "bobo",
    email: "bob@example.com",
    role: "observer",
    initials: "BO",
    avatarColor: "#f59e0b",
    lastActive: "2023-05-12T17:30:00Z"
  },
  {
    id: 5,
    fullName: "Intern User",
    username: "intern",
    email: "intern@example.com",
    role: "intern",
    initials: "IU",
    avatarColor: "#ef4444",
    lastActive: "2023-05-15T10:45:00Z"
  }
];

const userFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "partner", "analyst", "observer", "intern"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  passwordConfirm: z.string().min(6, "Password confirmation is required")
}).refine(data => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"]
});

type UserFormValues = z.infer<typeof userFormSchema>;

function getRandomColor() {
  const colors = Object.values(AVATAR_COLORS);
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRoleBadgeColor(role: string) {
  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    partner: "bg-blue-100 text-blue-800",
    analyst: "bg-green-100 text-green-800",
    observer: "bg-orange-100 text-orange-800",
    intern: "bg-purple-100 text-purple-800"
  };
  
  return roleColors[role] || "bg-gray-100 text-gray-800";
}

export default function UsersPage() {
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(typeof MOCK_USERS)[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Fetch users
  const { data: users = [], isLoading } = useQuery<typeof MOCK_USERS>({
    queryKey: ["/api/users"],
    placeholderData: MOCK_USERS // Use mockData as placeholder
  });

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created successfully",
        description: "New user has been added to the system",
      });
      setIsAddUserOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserFormValues> & { id: number }) => {
      const { id, ...data } = userData;
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated successfully",
        description: "User information has been updated",
      });
      setIsEditUserOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle edit user button click
  const handleEditUser = (user: (typeof MOCK_USERS)[0]) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };
  
  // Form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      role: "analyst",
      password: "",
      passwordConfirm: ""
    }
  });
  
  function onSubmit(data: UserFormValues) {
    createUserMutation.mutate(data);
  }
  
  return (
    <AppLayout>
      <div className="container py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage users and permissions.</p>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              View and manage user accounts and permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-neutral-500 bg-neutral-50 border-b">
                <div className="col-span-5">User</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-3">Last Active</div>
                <div className="col-span-1">Actions</div>
              </div>
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                    <div className="col-span-5 flex items-center gap-3">
                      <Avatar className="h-9 w-9" style={{ backgroundColor: user.avatarColor }}>
                        <AvatarFallback className="text-white">{user.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <span>@{user.username}</span>
                          <span className="text-neutral-300">•</span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <Badge className={`${getRoleBadgeColor(user.role)} capitalize`}>
                        {user.role}
                      </Badge>
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {new Date(user.lastActive).toLocaleDateString()} at {new Date(user.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="col-span-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit User</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Add User Dialog */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account and set their permissions.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="janedoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="analyst">Analyst</SelectItem>
                            <SelectItem value="observer">Observer</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jane.doe@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="passwordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details and permissions.
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <FormLabel>Full Name</FormLabel>
                  <Input 
                    defaultValue={selectedUser.fullName} 
                    onChange={(e) => setSelectedUser({...selectedUser, fullName: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel>Username</FormLabel>
                    <Input 
                      defaultValue={selectedUser.username} 
                      onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FormLabel>Role</FormLabel>
                    <Select 
                      defaultValue={selectedUser.role}
                      onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        <SelectItem value="observer">Observer</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <Input 
                    type="email" 
                    defaultValue={selectedUser.email} 
                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>New Password</FormLabel>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Leave blank to keep current password"
                    onChange={(e) => setSelectedUser({...selectedUser, newPassword: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only fill this if you want to change the password.
                  </p>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    onClick={() => {
                      // Filter out undefined values and create update object
                      const userToUpdate: any = {
                        id: selectedUser.id,
                        fullName: selectedUser.fullName,
                        username: selectedUser.username,
                        email: selectedUser.email,
                        role: selectedUser.role,
                      };
                      
                      if (selectedUser.newPassword) {
                        userToUpdate.password = selectedUser.newPassword;
                      }
                      
                      updateUserMutation.mutate(userToUpdate);
                    }} 
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Updating..." : "Update User"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
