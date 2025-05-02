import { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { insertUserSchema } from "@shared/schema";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, UserPlus, KeyRound, LucideChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const colors = [
  { name: "Blue", value: "#0E4DA4" },
  { name: "Green", value: "#2E7D32" },
  { name: "Purple", value: "#5E35B1" },
  { name: "Orange", value: "#E65100" },
  { name: "Red", value: "#C62828" },
  { name: "Teal", value: "#00796B" },
  { name: "Pink", value: "#AD1457" },
  { name: "Indigo", value: "#3949AB" },
];

// Enhanced schema with validation for registration
const registerFormSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// TypeScript types for our form values
type RegisterFormValues = z.infer<typeof registerFormSchema>;
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // If user is already logged in, redirect to home
  if (user) {
    setLocation("/");
    return null;
  }
  
  // Setup register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      initials: "",
      role: "analyst", // Default role
      avatarColor: "#0E4DA4" // Default color
    },
  });
  
  // Setup login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: ""
    },
  });
  
  // Handle registration form submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...userData } = data;
    
    // Set initials if not provided
    if (!userData.initials) {
      const nameParts = userData.fullName.split(' ');
      userData.initials = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
        : userData.fullName.substring(0, 2);
      userData.initials = userData.initials.toUpperCase();
    }
    
    registerMutation.mutate(userData, {
      onSuccess: () => {
        toast({
          title: "Registration successful",
          description: "Your account has been created.",
        });
        setLocation("/");
      }
    });
  };
  
  // Handle login form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        setLocation("/");
      }
    });
  };
  
  return (
    <div className="flex min-h-screen bg-neutral-50 p-0">
      {/* Left side - Authentication forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md mx-auto shadow-lg border-0 overflow-hidden">
          <CardHeader className="pb-3 bg-primary-50">
            <CardTitle className="text-2xl font-bold text-primary-900">
              {activeTab === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-primary-700">
              {activeTab === "login" 
                ? "Sign in to access your investments" 
                : "Join the investment tracking platform"}
            </CardDescription>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mx-6 mt-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login" className="p-0 m-0">
              <CardContent className="p-6">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      <KeyRound className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
              
              <CardFooter className="flex justify-center pb-6 pt-2 text-center">
                <p className="text-sm text-neutral-600">
                  Don't have an account?{" "}
                  <Button variant="link" className="p-0" onClick={() => setActiveTab("register")}>
                    Register now
                  </Button>
                </p>
              </CardFooter>
            </TabsContent>
            
            {/* Registration Form */}
            <TabsContent value="register" className="p-0 m-0">
              <CardContent className="p-6">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
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
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="analyst">Analyst</SelectItem>
                                <SelectItem value="partner">Partner</SelectItem>
                                <SelectItem value="observer">Observer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="initials"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initials (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="JD" maxLength={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={registerForm.control}
                      name="avatarColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar Color</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {colors.map((color) => (
                              <div 
                                key={color.value}
                                className={`w-8 h-8 rounded-full cursor-pointer transition-all ${field.value === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => field.onChange(color.value)}
                                title={color.name}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      <UserPlus className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
              
              <CardFooter className="flex justify-center pb-6 pt-2 text-center">
                <p className="text-sm text-neutral-600">
                  Already have an account?{" "}
                  <Button variant="link" className="p-0" onClick={() => setActiveTab("login")}>
                    Sign in
                  </Button>
                </p>
              </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary-600 to-primary-900 text-white p-8 lg:p-12">
        <div className="h-full flex flex-col justify-between max-w-md mx-auto">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">Investment Lifecycle Tracking</h1>
            <p className="text-lg lg:text-xl opacity-90 mb-6">
              A collaborative platform to manage your investment process from deal sourcing to portfolio monitoring.
            </p>
            
            <div className="space-y-6 mt-8">
              <FeatureItem icon={<ArrowRight />} title="Deal Tracking">
                Monitor your deal pipeline from initial review to investment
              </FeatureItem>
              
              <FeatureItem icon={<ArrowRight />} title="Fund Management">
                Track fund allocations, performance metrics, and sector distributions
              </FeatureItem>
              
              <FeatureItem icon={<ArrowRight />} title="Team Collaboration">
                Work together with customizable user roles and permissions
              </FeatureItem>
            </div>
          </div>
          
          <div className="pt-10">
            <p className="text-sm opacity-80">
              © {new Date().getFullYear()} Doliver Capital. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feature item with icon component
function FeatureItem({ 
  icon, 
  title, 
  children 
}: { 
  icon: React.ReactNode; 
  title: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-start space-x-4">
      <div className="bg-white/20 p-2 rounded-full">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-lg">{title}</h3>
        <p className="opacity-90">{children}</p>
      </div>
    </div>
  );
}
