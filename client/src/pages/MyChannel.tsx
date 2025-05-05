import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  ChevronRight, 
  LineChart, 
  Users, 
  PlaySquare, 
  Eye, 
  ThumbsUp, 
  MessageSquare,
  Edit,
  Trash2,
  PlusIcon,
  AlertTriangle
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChannelForm from "@/components/ChannelForm";
import UploadForm from "@/components/UploadForm";
import { cn } from "@/lib/utils";
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

export default function MyChannel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [uploadFormOpen, setUploadFormOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [videoToDelete, setVideoToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch user's channels
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/channels/user'],
    enabled: !!user,
  });

  // Fetch stats for dashboard
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  // Fetch user's videos
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['/api/videos', user?.id],
    enabled: !!user,
  });

  // Fetch user's subscriptions count
  const { data: subscribers, isLoading: subscribersLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'subscribers'],
    enabled: !!user,
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete video");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete video",
        variant: "destructive",
      });
    },
  });

  // Handle create new channel
  const handleCreateChannel = () => {
    setEditingChannel(null);
    setChannelFormOpen(true);
  };

  // Handle edit channel
  const handleEditChannel = (channel: any) => {
    setEditingChannel(channel);
    setChannelFormOpen(true);
  };

  // Handle upload video
  const handleUploadVideo = () => {
    setUploadFormOpen(true);
  };

  // Handle delete video 
  const handleDeleteVideo = (videoId: number) => {
    setVideoToDelete(videoId);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirm video deletion
  const confirmVideoDelete = () => {
    if (videoToDelete !== null) {
      deleteVideoMutation.mutate(videoToDelete);
      setVideoToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Stats Summary Cards
  const StatCard = ({ title, value, icon, className }: any) => (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  // Channel Card component
  const ChannelCard = ({ channel }: any) => (
    <Card 
      className={cn(
        "cursor-pointer hover:border-primary transition-colors",
        selectedChannel?.id === channel.id && "border-primary"
      )}
      onClick={() => setSelectedChannel(channel)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{channel.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {channel.description || "No description"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleEditChannel(channel);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Channel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/channel/${channel.id}`);
                }}
              >
                <ChevronRight className="mr-2 h-4 w-4" />
                View Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="flex justify-between text-sm">
          <div>Created:</div>
          <div className="text-muted-foreground">
            {formatDate(channel.createdAt)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedChannel(channel);
            handleUploadVideo();
          }}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload Video
        </Button>
      </CardFooter>
    </Card>
  );

  if (!user) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center h-[calc(100vh-16rem)]">
        <h1 className="text-2xl font-bold mb-4">You need to sign in first</h1>
        <p className="text-muted-foreground mb-6">Sign in to access your channel dashboard</p>
        <Button onClick={() => navigate("/")}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Channel</h1>
          <p className="text-muted-foreground">Manage your content and check performance</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCreateChannel}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Create Channel
          </Button>
          <Button 
            onClick={handleUploadVideo}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Upload Video
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total Views" 
              value={statsLoading ? "Loading..." : stats?.totalViews || 0}
              icon={<Eye className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
              title="Total Videos" 
              value={statsLoading ? "Loading..." : stats?.totalVideos || 0}
              icon={<PlaySquare className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
              title="Total Likes" 
              value={statsLoading ? "Loading..." : stats?.totalLikes || 0}
              icon={<ThumbsUp className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
              title="Subscribers" 
              value={subscribersLoading ? "Loading..." : subscribers?.count || 0}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Channel Performance</h2>
            {channelsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : !channels || channels.length === 0 ? (
              <Card className="text-center p-8">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-2">No channels yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first channel to start uploading videos</p>
                  <Button onClick={handleCreateChannel}>Create Channel</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {channels.map((channel: any) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Performance</h2>
            {videosLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : !videos || videos.length === 0 ? (
              <Card className="text-center p-8">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-2">No videos yet</h3>
                  <p className="text-muted-foreground mb-4">Upload your first video to start tracking performance</p>
                  <Button onClick={handleUploadVideo}>Upload Video</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>Your recent videos and their performance</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Upload Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.slice(0, 5).map((video: any) => (
                      <TableRow key={video.id} className="cursor-pointer" onClick={() => navigate(`/watch/${video.id}`)}>
                        <TableCell className="font-medium">{video.title}</TableCell>
                        <TableCell>{video.views}</TableCell>
                        <TableCell>{video.likes}</TableCell>
                        <TableCell>{video.comments || 0}</TableCell>
                        <TableCell>{formatDate(video.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels">
          {channelsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : !channels || channels.length === 0 ? (
            <Card className="text-center p-8">
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-2">No channels yet</h3>
                <p className="text-muted-foreground mb-4">Create your first channel to start uploading videos</p>
                <Button onClick={handleCreateChannel}>Create Channel</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel: any) => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos">
          {videosLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : !videos || videos.length === 0 ? (
            <Card className="text-center p-8">
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-2">No videos yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first video to start tracking performance</p>
                <Button onClick={handleUploadVideo}>Upload Video</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>All your videos</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video: any) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div 
                          className="h-16 w-28 bg-muted rounded-md overflow-hidden cursor-pointer"
                          onClick={() => navigate(`/watch/${video.id}`)}
                        >
                          <img 
                            src={video.thumbnailPath ? `/uploads/${video.thumbnailPath}` : 'https://via.placeholder.com/640x360'} 
                            alt={video.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer truncate max-w-[200px]"
                        onClick={() => navigate(`/watch/${video.id}`)}
                      >
                        {video.title}
                      </TableCell>
                      <TableCell>{video.duration ? formatDuration(video.duration) : 'N/A'}</TableCell>
                      <TableCell>{video.views}</TableCell>
                      <TableCell>{video.likes}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/watch/${video.id}`)}>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteVideo(video.id)} className="text-red-500">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Channel Form Dialog */}
      <ChannelForm 
        open={channelFormOpen} 
        onOpenChange={setChannelFormOpen}
        existingChannel={editingChannel}
      />

      {/* Upload Form Dialog */}
      <UploadForm 
        open={uploadFormOpen} 
        onOpenChange={setUploadFormOpen}
      />
      
      {/* Delete Video Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Video
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the video
              and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVideoDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}