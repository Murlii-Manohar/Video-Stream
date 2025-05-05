import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Bell, Eye, Lock, Moon, Shield, Sun, User } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // Form states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [restrictedMode, setRestrictedMode] = useState(false);
  const [videoQuality, setVideoQuality] = useState("auto");
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  const handleSaveGeneralSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your general settings have been updated",
    });
  };
  
  const handleSaveNotificationSettings = () => {
    toast({
      title: "Notifications updated",
      description: "Your notification preferences have been saved",
    });
  };
  
  const handleSavePlaybackSettings = () => {
    toast({
      title: "Playback settings saved",
      description: "Your video playback preferences have been updated",
    });
  };
  
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new password and confirmation match",
        variant: "destructive",
      });
      return;
    }
    
    // Password validation (simple example)
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password should be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Password updated",
      description: "Your password has been changed successfully",
    });
    
    // Reset form
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };
  
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="flex overflow-x-auto pb-2 mb-2">
          <TabsTrigger value="account">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Moon className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="playback">
            <Eye className="h-4 w-4 mr-2" />
            Playback
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Username</Label>
                <div className="flex items-center gap-2">
                  <Input value={user.username} disabled />
                  <Button variant="secondary" onClick={() => navigate("/profile")}>
                    Edit in Profile
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2">
                  <Input value={user.email} disabled />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Account Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Verify your account to access additional features
                    </p>
                  </div>
                  <div className="flex items-center">
                    {user.isVerified ? (
                      <span className="text-sm text-green-500 font-medium">Verified</span>
                    ) : (
                      <Button variant="link" className="text-blue-500">
                        Verify Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Delete Account</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all your data
                    </p>
                  </div>
                  <Button variant="destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveGeneralSettings}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how XPlayHD looks on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred theme mode
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      theme === "light" ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Sun className="h-6 w-6" />
                      <span className="text-sm font-medium">Light</span>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      theme === "dark" ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Moon className="h-6 w-6" />
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      theme === "system" ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-1">
                        <Sun className="h-6 w-6" />
                        <Moon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium">System</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications on your device
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <Label>Notification Types</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select which types of notifications you want to receive
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="subscription-notifications"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      defaultChecked
                    />
                    <Label htmlFor="subscription-notifications" className="text-sm font-normal">
                      New subscriber notifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="comment-notifications"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      defaultChecked
                    />
                    <Label htmlFor="comment-notifications" className="text-sm font-normal">
                      Comment notifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="like-notifications"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      defaultChecked
                    />
                    <Label htmlFor="like-notifications" className="text-sm font-normal">
                      Like notifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="system-notifications"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      defaultChecked
                    />
                    <Label htmlFor="system-notifications" className="text-sm font-normal">
                      System and account notifications
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotificationSettings}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="playback">
          <Card>
            <CardHeader>
              <CardTitle>Playback Settings</CardTitle>
              <CardDescription>
                Customize how videos play on XPlayHD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoplay">Autoplay Videos</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically play videos when the page loads
                  </p>
                </div>
                <Switch
                  id="autoplay"
                  checked={autoplay}
                  onCheckedChange={setAutoplay}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="restricted-mode">Restricted Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide potentially mature content
                  </p>
                </div>
                <Switch
                  id="restricted-mode"
                  checked={restrictedMode}
                  onCheckedChange={setRestrictedMode}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Video Quality</Label>
                <RadioGroup defaultValue={videoQuality} onValueChange={setVideoQuality}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="quality-auto" />
                    <Label htmlFor="quality-auto" className="text-sm font-normal">Auto (recommended)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="quality-high" />
                    <Label htmlFor="quality-high" className="text-sm font-normal">High (uses more data)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="data-saver" id="quality-data-saver" />
                    <Label htmlFor="quality-data-saver" className="text-sm font-normal">Data saver (lower quality)</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePlaybackSettings}>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters long
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button type="submit">Change Password</Button>
                </div>
              </form>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Set Up 2FA
                </Button>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Security Log</h3>
                <p className="text-sm text-muted-foreground">
                  View recent account activity
                </p>
                <div className="border rounded-md divide-y">
                  <div className="p-3 flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Login</p>
                      <p className="text-xs text-muted-foreground">From Windows, Chrome</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Today, 10:45 AM</p>
                  </div>
                  <div className="p-3 flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Password Changed</p>
                      <p className="text-xs text-muted-foreground">From Windows, Chrome</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Last week</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}