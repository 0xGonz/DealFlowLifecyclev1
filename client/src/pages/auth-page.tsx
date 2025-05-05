import { useState } from 'react';
import { useLocation, Redirect } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/context/auth-context';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  passwordConfirm: z.string().min(6, 'Please confirm your password'),
}).refine(data => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [location, navigate] = useLocation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { user, isLoading, login, register } = useAuth();
  const { toast } = useToast();

  // Redirect to home if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 p-4 relative">
      {isAuthenticating && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h3 className="font-semibold text-xl mb-2">Authenticating...</h3>
            <p className="text-muted-foreground">Preparing your dashboard</p>
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl w-full">
        {/* Hero section */}
        <div className="flex flex-col justify-center p-6 bg-primary-50 rounded-xl border border-primary-100">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-gradient-to-r from-primary-700 to-indigo-700">Investment Lifecycle Tracker</h1>
            <p className="text-xl text-neutral-700">
              Streamline your investment process, from deal intake through evaluation to performance tracking.
            </p>
            <div className="space-y-4 text-neutral-600">
              <div className="flex items-start gap-2">
                <div className="bg-primary-100 p-1 rounded-full mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-700" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p>Comprehensive deal tracking and evaluation</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary-100 p-1 rounded-full mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-700" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p>Collaborative workspace for your investment team</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary-100 p-1 rounded-full mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-700" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p>Secure document management and sharing</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Forms section */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg border-neutral-200">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>
                Access your investment tracking dashboard
              </CardDescription>
            </CardHeader>
            <Tabs 
              defaultValue="login" 
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <LoginForm onSubmit={async (username, password) => {
                  try {
                    const res = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ username, password }),
                      credentials: 'include'
                    });
                    
                    if (!res.ok) {
                      const errorText = await res.text();
                      throw new Error(errorText || 'Login failed');
                    }
                    
                    const userData = await res.json();
                    console.log('Login successful:', userData);
                    
                    // Show success toast
                    toast({
                      title: 'Login Successful',
                      description: 'Welcome back!',
                      variant: 'default'
                    });
                    
                    // Force refresh user data in the auth context
                    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                    
                    // Show the loading animation
                    setIsAuthenticating(true);
                    
                    // Add a slight delay before redirect to show the animation
                    setTimeout(() => {
                      // Redirect to home page
                      window.location.href = '/';
                    }, 1500);
                  } catch (error) {
                    console.error('Login error:', error);
                    toast({
                      title: 'Login Failed',
                      description: error instanceof Error ? error.message : 'Unknown error occurred',
                      variant: 'destructive'
                    });
                  }
                }} isLoading={isLoading} />
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register">
                <RegisterForm onSubmit={async (data) => {
                  try {
                    const res = await fetch('/api/auth/register', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        username: data.username,
                        fullName: data.fullName,
                        email: data.email,
                        password: data.password,
                        passwordConfirm: data.passwordConfirm
                      }),
                      credentials: 'include'
                    });
                    
                    if (!res.ok) {
                      const errorText = await res.text();
                      throw new Error(errorText || 'Registration failed');
                    }
                    
                    const userData = await res.json();
                    console.log('Registration successful:', userData);
                    
                    // Show success toast
                    toast({
                      title: 'Registration Successful',
                      description: 'Your account has been created.',
                      variant: 'default'
                    });
                    
                    // Force refresh user data in the auth context
                    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                    
                    // Show the loading animation
                    setIsAuthenticating(true);
                    
                    // Add a slight delay before redirect to show the animation
                    setTimeout(() => {
                      // Redirect to home page
                      window.location.href = '/';
                    }, 1500);
                  } catch (error) {
                    console.error('Registration error:', error);
                    toast({
                      title: 'Registration Failed',
                      description: error instanceof Error ? error.message : 'Unknown error occurred',
                      variant: 'destructive'
                    });
                  }
                }} isLoading={isLoading} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSubmit, isLoading }: { onSubmit: (username: string, password: string) => Promise<void>, isLoading: boolean }) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function handleSubmit(data: LoginFormValues) {
    try {
      const { username, password } = data;
      await onSubmit(username, password);
    } catch (error) {
      // Error is handled in the auth context
      console.error('Login error:', error);
    }
  }

  return (
    <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </Form>
    </CardContent>
  );
}

function RegisterForm({ onSubmit, isLoading }: { onSubmit: (data: RegisterFormValues) => Promise<void>, isLoading: boolean }) {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      password: '',
      passwordConfirm: '',
    },
  });

  async function handleSubmit(data: RegisterFormValues) {
    try {
      await onSubmit(data);
    } catch (error) {
      // Error is handled in the auth context
      console.error('Registration error:', error);
    }
  }

  return (
    <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
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
          <FormField
            control={form.control}
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
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
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Register"
            )}
          </Button>
        </form>
      </Form>
    </CardContent>
  );
}
