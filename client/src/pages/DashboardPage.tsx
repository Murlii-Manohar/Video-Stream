import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Eye, 
  ThumbsUp, 
  Users, 
  Video, 
  BarChart, 
  Clock, 
  TrendingUp,
  Loader2,
  PlusIcon 
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });
  
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/channels/user'],
    enabled: !!user,
  });
  
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['/api/videos', user?.id],
    enabled: !!user,
  });
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  // Mock data for charts
  const viewsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Views',
        data: [3000, 5000, 4000, 7000, 6000, 8000, 10000],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };
  
  const engagementData = {
    labels: ['Likes', 'Comments', 'Shares', 'Saves'],
    datasets: [
      {
        label: 'Engagement',
        data: [stats?.totalLikes || 0, stats?.totalComments || 0, 25, 42],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  const isLoading = statsLoading || channelsLoading || videosLoading;
  const hasChannels = channels && channels.length > 0;
  
  return (
    <div className="container py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Track your content performance and channel growth</p>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !hasChannels ? (
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Create Your First Channel</h2>
                <p className="text-muted-foreground">You need to create a channel to access dashboard features and upload videos.</p>
              </div>
              <Button onClick={() => navigate("/my-channels")}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{formatNumber(stats?.totalViews || 0)}</div>
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
                  <div className="text-2xl font-bold">{formatNumber(stats?.totalLikes || 0)}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Video className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{formatNumber(stats?.totalVideos || 0)}</div>
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
                  <div className="text-2xl font-bold">{formatNumber(stats?.totalSubscribers || 0)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="views">
                <Eye className="h-4 w-4 mr-2" />
                Views
              </TabsTrigger>
              <TabsTrigger value="engagement">
                <Activity className="h-4 w-4 mr-2" />
                Engagement
              </TabsTrigger>
              <TabsTrigger value="channels">
                <Users className="h-4 w-4 mr-2" />
                Channels
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Views Over Time</CardTitle>
                    <CardDescription>Monthly view count for all your videos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Line 
                        data={viewsData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Metrics</CardTitle>
                    <CardDescription>Breakdown of user interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Bar 
                        data={engagementData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="views" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Views Analytics</CardTitle>
                  <CardDescription>View performance across your channels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <Line 
                      data={viewsData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="engagement" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                  <CardDescription>How users interact with your content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <Bar 
                      data={engagementData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="channels" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map((channel: any) => (
                  <Card key={channel.id}>
                    <CardHeader>
                      <CardTitle>{channel.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {channel.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subscribers:</span>
                          <span>{channel.subscriberCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Videos:</span>
                          <span>{videos.filter((v: any) => v.userId === channel.userId).length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Performing Videos</CardTitle>
                <CardDescription>Your most viewed content</CardDescription>
              </CardHeader>
              <CardContent>
                {videos && videos.length > 0 ? (
                  <div className="space-y-4">
                    {videos
                      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
                      .slice(0, 5)
                      .map((video: any) => (
                        <div key={video.id} className="flex items-center space-x-4 border-b pb-4 last:border-0">
                          <div className="w-16 h-9 bg-muted rounded overflow-hidden">
                            <img 
                              src={video.thumbnailPath || "/placeholder-thumbnail.jpg"} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{video.title}</p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Eye className="h-3 w-3 mr-1" /> {video.views || 0}
                              <ThumbsUp className="h-3 w-3 ml-3 mr-1" /> {video.likes || 0}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 border rounded-lg">
                    <p className="text-muted-foreground">No videos available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>At a glance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-3 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Most Growth</p>
                      <p className="text-xs text-muted-foreground">
                        Views up by 25% this month
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Watch Time</p>
                      <p className="text-xs text-muted-foreground">
                        Average: 3m 45s per video
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-3 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Subscribers</p>
                      <p className="text-xs text-muted-foreground">
                        +12 new subscribers this week
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}