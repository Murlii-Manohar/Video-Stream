import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  XIcon, 
  EyeIcon, 
  EyeOffIcon, 
  Loader2,
  MailCheck,
  AlertTriangleIcon
} from "lucide-react";
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

interface LoginFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

// Register form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Email verification schema
const verificationSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function LoginForm({ open, onOpenChange }: LoginFormProps) {
  const { login, register, sendVerificationCode, verifyEmail, clearError } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Verification dialog state
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<RegisterFormValues | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Verification form
  const verificationForm = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });
  
  // Timer for resending code
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (codeExpiry && timeRemaining > 0 && !canResend) {
      interval = setInterval(() => {
        const secondsLeft = Math.max(0, Math.floor((codeExpiry.getTime() - Date.now()) / 1000));
        if (secondsLeft <= 0) {
          setCanResend(true);
          setTimeRemaining(0);
          clearInterval(interval);
        } else {
          setTimeRemaining(secondsLeft > 60 ? 60 : secondsLeft);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [codeExpiry, canResend, timeRemaining]);
  
  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password);
      onOpenChange(false);
      toast({
        title: "Success",
        description: "You have been logged in",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to login",
        variant: "destructive",
      });
    }
  };
  
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      // Save the registration data for after verification
      setPendingRegistration(values);
      setVerificationEmail(values.email);
      setVerificationOpen(true);
      
      // Send verification code immediately
      await handleSendCode(values.email);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process registration",
        variant: "destructive",
      });
    }
  };
  
  const handleSendCode = async (email: string) => {
    setIsSendingCode(true);
    try {
      const success = await sendVerificationCode(email);
      if (success) {
        // Set timer for resending code (1 minute)
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 1);
        setCodeExpiry(expiry);
        setTimeRemaining(60);
        setCanResend(false);
        
        toast({
          title: "Code Sent",
          description: "A verification code has been sent to your email address",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };
  
  const onVerifySubmit = async (values: VerificationFormValues) => {
    if (!pendingRegistration || !verificationEmail) return;
    
    setIsVerifying(true);
    try {
      const verified = await verifyEmail(verificationEmail, values.code);
      
      if (verified) {
        // Email is verified, proceed with registration
        await register(pendingRegistration);
        
        // Close dialogs and reset forms
        setVerificationOpen(false);
        onOpenChange(false);
        verificationForm.reset();
        registerForm.reset();
        
        toast({
          title: "Success",
          description: "Your account has been created successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Invalid or expired verification code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Verification failed",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Clear forms and errors when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      loginForm.reset();
      registerForm.reset();
      verificationForm.reset();
      clearError();
      setVerificationOpen(false);
      setPendingRegistration(null);
    }
    onOpenChange(open);
  };
  
  const handleVerificationClose = () => {
    setVerificationOpen(false);
    setPendingRegistration(null);
    verificationForm.reset();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-poppins font-bold">
              {activeTab === "login" ? "Sign In" : "Create Account"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "login"
                ? "Sign in to your XPlayHD account"
                : "Create a new XPlayHD account"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
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
                        <div className="relative">
                          <FormControl>
                            <Input 
                              type={showLoginPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            tabIndex={-1}
                          >
                            {showLoginPassword ? (
                              <EyeOffIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-center justify-between">
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm cursor-pointer">Remember me</FormLabel>
                        </FormItem>
                      )}
                    />
                    <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                    {loginForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="you@example.com" 
                            {...field} 
                            type="email"
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
                        <div className="relative">
                          <FormControl>
                            <Input 
                              type={showRegisterPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            tabIndex={-1}
                          >
                            {showRegisterPassword ? (
                              <EyeOffIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
                        <div className="relative">
                          <FormControl>
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOffIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerForm.formState.isSubmitting}
                  >
                    {registerForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
              By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email Verification Dialog */}
      <AlertDialog open={verificationOpen} onOpenChange={setVerificationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <MailCheck className="mr-2 h-5 w-5 text-primary" />
              Verify Your Email
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please verify your email address by entering the 6-digit code sent to <span className="font-medium">{verificationEmail}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Form {...verificationForm}>
            <form onSubmit={verificationForm.handleSubmit(onVerifySubmit)} className="space-y-4 py-4">
              <FormField
                control={verificationForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123456" 
                        maxLength={6}
                        className="text-center tracking-widest text-lg"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between items-center mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleSendCode(verificationEmail)} 
                  disabled={isSendingCode || !canResend}
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : !canResend ? (
                    `Resend in ${timeRemaining}s`
                  ) : (
                    "Resend Code"
                  )}
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isVerifying || verificationForm.formState.isSubmitting}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </form>
          </Form>
          
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleVerificationClose}>Cancel</AlertDialogCancel>
            <div className="text-sm text-muted-foreground">
              <AlertTriangleIcon className="inline-block h-4 w-4 mr-1" />
              Verification is required to create your account
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
