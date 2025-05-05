import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, PencilIcon, CameraIcon, LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      
      if (user.profileImage) {
        setImagePreview(user.profileImage);
      }
    }
  }, [user]);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("PATCH", "/api/users/profile", formData, { 
        isFormData: true 
      });
      return response.json();
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("username", username);
    formData.append("displayName", displayName);
    formData.append("bio", bio);
    
    if (profileImage) {
      formData.append("profileImage", profileImage);
    }
    
    updateProfileMutation.mutate(formData);
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <Avatar className="w-32 h-32 border-4 border-border">
                    <AvatarImage src={imagePreview || user.profileImage || ""} />
                    <AvatarFallback className="text-3xl bg-primary text-white">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <label 
                      htmlFor="profile-image" 
                      className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
                    >
                      <CameraIcon className="h-5 w-5" />
                      <input 
                        type="file" 
                        id="profile-image" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
                
                <h2 className="text-xl font-semibold mb-1">{user.displayName || user.username}</h2>
                <p className="text-muted-foreground text-sm mb-4">@{user.username}</p>
                
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsEditing(true)}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2 w-full">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form
                        setUsername(user.username || "");
                        setDisplayName(user.displayName || "");
                        setBio(user.bio || "");
                        setProfileImage(null);
                        setImagePreview(user.profileImage || "");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleProfileUpdate}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <PencilIcon className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-1">
                <div>
                  <span className="text-muted-foreground text-sm">Email</span>
                  <p>{user.email}</p>
                </div>
                
                {user.bio && !isEditing && (
                  <div className="mt-4">
                    <span className="text-muted-foreground text-sm">Bio</span>
                    <p className="whitespace-pre-wrap">{user.bio}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="md:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              {isEditing ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>Update your profile information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input 
                          id="username" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Username"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="display-name">Display Name</Label>
                        <Input 
                          id="display-name" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Display Name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea 
                          id="bio" 
                          value={bio} 
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell us about yourself"
                          rows={4}
                        />
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Account Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-medium text-sm text-muted-foreground mb-1">Username</h3>
                            <p>{user.username}</p>
                          </div>
                          <div>
                            <h3 className="font-medium text-sm text-muted-foreground mb-1">Display Name</h3>
                            <p>{user.displayName || "-"}</p>
                          </div>
                          <div>
                            <h3 className="font-medium text-sm text-muted-foreground mb-1">Email</h3>
                            <p>{user.email}</p>
                          </div>
                          <div>
                            <h3 className="font-medium text-sm text-muted-foreground mb-1">Status</h3>
                            <p className="flex items-center">
                              <span className={cn(
                                "inline-block w-2 h-2 rounded-full mr-2",
                                user.isVerified ? "bg-green-500" : "bg-yellow-500"
                              )}></span>
                              {user.isVerified ? "Verified" : "Unverified"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Bio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {user.bio ? (
                        <p className="whitespace-pre-wrap">{user.bio}</p>
                      ) : (
                        <p className="text-muted-foreground italic">No bio provided</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent interactions on XPlayHD</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border rounded-lg">
                    <p className="text-muted-foreground">Your recent activity will be shown here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="favorites" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Favorite Videos</CardTitle>
                  <CardDescription>Videos you've liked or saved</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border rounded-lg">
                    <p className="text-muted-foreground">Your favorite videos will be shown here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Channel Creation Banner */}
      <Card className="mt-8 bg-muted/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Start Creating Content</h2>
              <p className="text-muted-foreground">Create your channel to start uploading videos and building your audience.</p>
            </div>
            <Button onClick={() => navigate("/create-channel")}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Channel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}