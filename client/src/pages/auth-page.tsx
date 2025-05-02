import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleUserRound, KeyRound, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roleOptions = [
  { value: "analyst", label: "Analyst" },
  { value: "partner", label: "Partner" },
  { value: "admin", label: "Admin" },
  { value: "observer", label: "Observer" },
];

const colorOptions = [
  { value: "#0E4DA4", label: "Blue", bg: "bg-blue-500" },
  { value: "#16A34A", label: "Green", bg: "bg-green-500" },
  { value: "#DC2626", label: "Red", bg: "bg-red-500" },
  { value: "#7E22CE", label: "Purple", bg: "bg-purple-500" },
  { value: "#F97316", label: "Orange", bg: "bg-orange-500" },
  { value: "#14B8A6", label: "Teal", bg: "bg-teal-500" },
  { value: "#6366F1", label: "Indigo", bg: "bg-indigo-500" },
  { value: "#EC4899", label: "Pink", bg: "bg-pink-500" },
];

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string(),
  initials: z.string().max(3, "Initials must be 1-3 characters"),
  avatarColor: z.string(),
});

function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [location, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "analyst",
      initials: "",
      avatarColor: "#0E4DA4",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(values);
  };

  // Auto-populate initials when full name changes
  useEffect(() => {
    const fullName = registerForm.watch("fullName");
    if (fullName) {
      const nameParts = fullName.split(" ");
      let initials = "";
      
      if (nameParts.length === 1) {
        // Just use first two letters of single name
        initials = nameParts[0].substring(0, 2).toUpperCase();
      } else {
        // Use first letter of first and last name
        initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      
      registerForm.setValue("initials", initials);
    }
  }, [registerForm.watch("fullName")]);

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Login/Register Form */}
      <div className="flex flex-col items-center justify-center w-full md:w-1/2 px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Doliver
              </span>{" "}
              Investment Tracker
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your investment workflow seamlessly
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Username"
                                {...field}
                                className="w-full"
                              />
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
                              <Input
                                type="password"
                                placeholder="Password"
                                {...field}
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          <>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Login
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Register for a new account to track investments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Username"
                                  {...field}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Password"
                                  {...field}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Full Name"
                                {...field}
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="email@company.com"
                                {...field}
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  {roleOptions.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
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
                              <FormLabel>Initials</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Initials"
                                  maxLength={3}
                                  {...field}
                                  className="w-full"
                                />
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
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                              {colorOptions.map((color) => (
                                <div
                                  key={color.value}
                                  className={`h-10 w-10 rounded-full cursor-pointer flex items-center justify-center transition-all ${color.bg} ${field.value === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                  onClick={() => {
                                    field.onChange(color.value);
                                  }}
                                  title={color.label}
                                >
                                  {field.value === color.value && (
                                    <div className="text-white text-xs">✓</div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex mt-6">
                        <div className="flex-grow">
                          <div className="font-semibold">Preview:</div>
                          <div className="flex items-center mt-2">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                              style={{ backgroundColor: registerForm.watch("avatarColor") }}
                            >
                              {registerForm.watch("initials")}
                            </div>
                            <div className="ml-3">
                              <div className="font-medium">{registerForm.watch("fullName") || "Your Name"}</div>
                              <div className="text-sm text-muted-foreground">
                                {roleOptions.find(r => r.value === registerForm.watch("role"))?.label || "Role"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            <CircleUserRound className="mr-2 h-4 w-4" />
                            Create Account
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary to-primary-foreground items-center justify-center">
        <div className="max-w-md p-8 text-white">
          <h2 className="text-3xl font-bold mb-6">
            Complete Investment Lifecycle Tracking
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Manage the complete deal evaluation process</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Track performance with real-time metrics</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Collaborate with your team on deal analysis</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Document management for all investment assets</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Allocation tracking across multiple funds</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
