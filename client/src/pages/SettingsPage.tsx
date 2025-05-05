import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ThemeProvider";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldAlert,
  UserCog,
  AlertTriangle,
  Globe,
  Palette,
  Monitor,
  Sun,
  Moon,
  BellRing,
  Volume2,
  VolumeX,
  SmartphoneNfc,
  Trash2
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  const [language, setLanguage] = useState("english");
  const [autoplay, setAutoplay] = useState(true);
  const [restrictedMode, setRestrictedMode] = useState(false);
  
  // Update User Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/users/settings", data);
      return response.json();
    },
    onSuccess: () => {
      refreshUser();
      toast({
        title: "Settings updated",
        description: "Your settings have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast({
        title: "Failed to change password",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Delete Account Mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/users/account");
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully",
      });
      await logout();
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Failed to delete account",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveNotificationSettings = () => {
    updateSettingsMutation.mutate({
      emailNotifications,
      browserNotifications,
      marketingEmails,
    });
  };
  
  const handleSavePrivacySettings = () => {
    updateSettingsMutation.mutate({
      twoFactorEnabled,
      restrictedMode,
    });
  };
  
  const handleSaveAppearanceSettings = () => {
    // Theme is managed by ThemeProvider
    updateSettingsMutation.mutate({
      language,
      autoplay,
    });
  };
  
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate({ 
      currentPassword, 
      newPassword 
    });
  };
  
  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };
  
  if (!user) {
    setLocation("/auth");
    return null;
  }
  
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="hidden md:block">Appearance</TabsTrigger>
          <TabsTrigger value="privacy" className="hidden md:block">Privacy</TabsTrigger>
          <TabsTrigger value="advanced" className="hidden md:block">Advanced</TabsTrigger>
        </TabsList>
        
        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and security settings
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={user.username} 
                      disabled 
                    />
                    <p className="text-xs text-muted-foreground">
                      To change your username, visit your profile page
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="email" 
                        value={user.email} 
                        disabled 
                      />
                      <div className={cn(
                        "px-2 py-1 text-xs rounded-full",
                        user.isVerified 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                      )}>
                        {user.isVerified ? "Verified" : "Unverified"}
                      </div>
                    </div>
                    {!user.isVerified && (
                      <Button 
                        variant="link" 
                        className="text-xs h-auto p-0 text-amber-600 dark:text-amber-400"
                        onClick={() => {/* Implement verification resend */}}
                      >
                        Resend verification email
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Password Change Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input 
                        id="current-password" 
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input 
                        id="new-password" 
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    disabled={
                      !currentPassword || 
                      !newPassword || 
                      !confirmPassword ||
                      changePasswordMutation.isPending
                    }
                  >
                    {changePasswordMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Change Password
                  </Button>
                </form>
              </div>
              
              <Separator />
              
              {/* Danger Zone */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all of your content. This action is irreversible.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers, including all videos, comments, subscriptions and channel information.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deleteAccountMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage how you receive notifications and updates
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about new subscriptions, comments and likes
                    </p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show desktop notifications for important events
                    </p>
                  </div>
                  <Switch 
                    checked={browserNotifications}
                    onCheckedChange={setBrowserNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive promotional offers and platform updates
                    </p>
                  </div>
                  <Switch 
                    checked={marketingEmails}
                    onCheckedChange={setMarketingEmails}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveNotificationSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={cn(
                        "border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                        theme === "light" 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/25"
                      )}
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-6 w-6" />
                      <span className="text-sm font-medium">Light</span>
                    </div>
                    
                    <div 
                      className={cn(
                        "border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                        theme === "dark" 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/25"
                      )}
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-6 w-6" />
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                    
                    <div 
                      className={cn(
                        "border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                        theme === "system" 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/25"
                      )}
                      onClick={() => setTheme("system")}
                    >
                      <Monitor className="h-6 w-6" />
                      <span className="text-sm font-medium">System</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Language</Label>
                  <RadioGroup 
                    value={language} 
                    onValueChange={setLanguage}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-3 space-y-0">
                      <RadioGroupItem value="english" id="lang-english" />
                      <Label htmlFor="lang-english" className="font-normal">English</Label>
                    </div>
                    <div className="flex items-center space-x-3 space-y-0">
                      <RadioGroupItem value="spanish" id="lang-spanish" />
                      <Label htmlFor="lang-spanish" className="font-normal">Spanish</Label>
                    </div>
                    <div className="flex items-center space-x-3 space-y-0">
                      <RadioGroupItem value="french" id="lang-french" />
                      <Label htmlFor="lang-french" className="font-normal">French</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Autoplay Videos</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically play videos when browsing
                    </p>
                  </div>
                  <Switch 
                    checked={autoplay}
                    onCheckedChange={setAutoplay}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveAppearanceSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
              <CardDescription>
                Manage your account security and privacy settings
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch 
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Restricted Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Hide content that may be inappropriate
                    </p>
                  </div>
                  <Switch 
                    checked={restrictedMode}
                    onCheckedChange={setRestrictedMode}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSavePrivacySettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configure advanced options for your account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/download-data")}
                  className="w-full justify-start"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Download Your Data
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/api-access")}
                  className="w-full justify-start"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  API Access
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => logout()}
                  className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out of All Devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}