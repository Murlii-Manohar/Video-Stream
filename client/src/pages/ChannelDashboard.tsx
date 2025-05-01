import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useUserVideos } from "@/hooks/useVideos";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber, formatDuration } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoCard } from "@/components/VideoCard";
import { Loader2, Plus, Settings, Users, Eye, ThumbsUp, MessageSquare, Clock, Trash2, Edit, Tv } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ChannelForm from "@/components/ChannelForm";
import { Separator } from "@/components/ui/separator";

// Channel type definition for the component
interface Channel {
  id: number;
  name: string;
  description?: string;
  bannerImage?: string;
  createdAt: string;
  subscriberCount?: number;
}

export default function ChannelDashboard() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("channels");
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [editChannelOpen, setEditChannelOpen] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Fetch user's channels
  const { 
    data: channels, 
    isLoading: channelsLoading,
    refetch: refetchChannels
  } = useQuery({
    queryKey: ['/api/channels/user'],
    enabled: !!user,
  });
  
  // Fetch user's videos when a channel is selected
  const { 
    data: videos, 
    isLoading: videosLoading,
    refetch: refetchVideos
  } = useUserVideos(user?.id || null);
  
  // Calculate analytics
  const totalViews = videos?.reduce((sum, video) => sum + (video.views || 0), 0) || 0;
  const totalLikes = videos?.reduce((sum, video) => sum + (video.likes || 0), 0) || 0;
  const totalVideos = videos?.length || 0;
  
  const handleEditChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setEditChannelOpen(true);
  };
  
  const handleCreateChannelClose = () => {
    setCreateChannelOpen(false);
    refetchChannels();
  };
  
  const handleEditChannelClose = () => {
    setEditChannelOpen(false);
    refetchChannels();
  };
  
  const selectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setSelectedTab('videos');
  };
  
  if (!user) {
    return <div className="p-4 text-center">Please log in to view your channel dashboard</div>;
  }
  
  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channel Dashboard</h1>
          <p className="text-muted-foreground">Manage your channels, videos, and track performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateChannelOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create Channel
          </Button>
          <Button onClick={() => navigate("/upload")} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Upload Video
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="channels" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="channels">My Channels</TabsTrigger>
          {selectedChannel && (
            <>
              <TabsTrigger value="videos">Channel Videos ({totalVideos})</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="channels">
          {channelsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : channels && channels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((channel: Channel) => (
                <Card key={channel.id} className="overflow-hidden">
                  <div className="h-32 bg-muted relative">
                    {channel.bannerImage ? (
                      <img 
                        src={channel.bannerImage} 
                        alt={`${channel.name} banner`}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Tv className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle>{channel.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {channel.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{formatNumber(channel.subscriberCount || 0)} subscribers</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => selectChannel(channel)}>
                      Manage Channel
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditChannel(channel)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">No channels yet</h3>
              <p className="text-muted-foreground mb-4">Create your first channel to start uploading videos</p>
              <Button onClick={() => setCreateChannelOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Channel
              </Button>
            </div>
          )}
        </TabsContent>
        
        {selectedChannel && (
          <>
            <TabsContent value="videos">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedChannel.name}</h2>
                    <p className="text-muted-foreground">{selectedChannel.description}</p>
                  </div>
                  <Button onClick={() => navigate("/upload")} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Upload to this channel
                  </Button>
                </div>
                
                <Separator className="my-4" />
                
                {/* Analytics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{formatNumber(totalViews)}</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <ThumbsUp className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{formatNumber(totalLikes)}</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{formatNumber(selectedChannel.subscriberCount || 0)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            
              {videosLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : videos && videos.length > 0 ? (
                <div className="space-y-4">
                  {videos.map((video) => (
                    <div key={video.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg">
                      <div className="w-full md:w-64 h-36 overflow-hidden rounded-md">
                        <img 
                          src={video.thumbnailPath || '/placeholder-thumbnail.jpg'} 
                          alt={video.title}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {video.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center">
                            <Eye className="mr-1 h-4 w-4" />
                            {formatNumber(video.views || 0)} views
                          </div>
                          <div className="flex items-center">
                            <ThumbsUp className="mr-1 h-4 w-4" />
                            {formatNumber(video.likes || 0)} likes
                          </div>
                          <div className="flex items-center">
                            <MessageSquare className="mr-1 h-4 w-4" />
                            0 comments
                          </div>
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4" />
                            {formatDuration(video.duration || 0)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/watch?v=${video.id}`)}>
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete your video and remove it from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">No videos in this channel yet</h3>
                  <p className="text-muted-foreground mb-4">Upload your first video to start building your channel</p>
                  <Button onClick={() => navigate("/upload")}>
                    <Plus className="mr-2 h-4 w-4" /> Upload Video
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Analytics: {selectedChannel.name}</CardTitle>
                  <CardDescription>
                    Insights into how your channel is performing over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border rounded-md">
                    <p className="text-muted-foreground">Detailed analytics visualization coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
      
      {/* Channel Creation Dialog */}
      <ChannelForm 
        open={createChannelOpen} 
        onOpenChange={handleCreateChannelClose} 
      />
      
      {/* Channel Edit Dialog */}
      {selectedChannel && (
        <ChannelForm 
          open={editChannelOpen} 
          onOpenChange={handleEditChannelClose}
          existingChannel={selectedChannel}
        />
      )}
    </div>
  );
}