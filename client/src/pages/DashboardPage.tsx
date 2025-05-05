import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useLocation as useWouterLocation } from "wouter";
import { formatCount, formatDate, formatDuration, truncateString } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CirclePlay,
  Eye,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Loader2,
  ArrowUpRight,
  Users,
  Video,
  LayoutDashboard,
  ArrowRight,
  ArrowUpFromLine
} from "lucide-react";
import { Channel, Video as VideoType } from "@shared/schema";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [location] = useWouterLocation();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  
  // Parse the current URL to extract the channelId if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const channelId = urlParams.get("channelId");
    if (channelId) {
      setSelectedChannelId(Number(channelId));
    }
  }, [location]);

  // Get the user's channels
  const { 
    data: channels, 
    isLoading: isLoadingChannels
  } = useQuery<Channel[]>({
    queryKey: ["/api/channels/user"],
    enabled: !!user,
  });

  // Get analytics for the selected channel
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
  } = useQuery<any>({
    queryKey: [`/api/analytics/channel/${selectedChannelId}`],
    enabled: !!selectedChannelId,
  });

  // Get the videos for the selected channel
  const {
    data: videos,
    isLoading: isLoadingVideos,
  } = useQuery<VideoType[]>({
    queryKey: [`/api/channels/${selectedChannelId}/videos`],
    enabled: !!selectedChannelId,
  });

  // Get the selected channel details
  const {
    data: selectedChannel,
    isLoading: isLoadingChannel,
  } = useQuery<Channel>({
    queryKey: [`/api/channels/${selectedChannelId}`],
    enabled: !!selectedChannelId,
  });

  // Set the first channel as the selected one if none is selected already
  useEffect(() => {
    if (!selectedChannelId && channels && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  // Mock data for charts
  const viewsData = [
    { name: 'Jan', views: 4000 },
    { name: 'Feb', views: 3000 },
    { name: 'Mar', views: 2000 },
    { name: 'Apr', views: 2780 },
    { name: 'May', views: 1890 },
    { name: 'Jun', views: 2390 },
    { name: 'Jul', views: 3490 },
  ];

  const categoryData = [
    { name: 'Amateur', value: 400 },
    { name: 'Threesome', value: 300 },
    { name: 'MILF', value: 300 },
    { name: 'Blonde', value: 200 },
    { name: 'Asian', value: 150 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const engagement = analytics?.totalLikes + analytics?.totalComments || 0;

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage and track your content performance</p>
        </div>
        {channels && channels.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            <select 
              className="px-4 py-2 rounded-md border bg-background"
              value={selectedChannelId || ""}
              onChange={(e) => setSelectedChannelId(Number(e.target.value))}
              disabled={isLoadingChannels}
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>{channel.name}</option>
              ))}
            </select>
            <Button 
              variant="outline"
              onClick={() => setLocation(`/my-channel/${selectedChannelId}`)}
              disabled={!selectedChannelId}
            >
              Manage Channel
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isLoadingChannels || isLoadingChannel || isLoadingAnalytics ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : channels && channels.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <LayoutDashboard className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Channels Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              You haven't created any channels yet. Create a channel to start tracking your content performance.
            </p>
            <Button onClick={() => setLocation("/my-channels")}>
              Go to My Channels
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="revenue" className="hidden md:block">Revenue</TabsTrigger>
            <TabsTrigger value="settings" className="hidden md:block">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Channel Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{selectedChannel?.name || "Channel"}</CardTitle>
                  <CardDescription>
                    {selectedChannel?.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Created</span>
                      <span>{formatDate(selectedChannel?.createdAt)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Total Videos</span>
                      <span>{formatCount(videos?.length || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Performance</CardTitle>
                  <CardDescription>
                    Channel views, likes, and engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Total Views</span>
                      <span className="text-2xl font-bold">{formatCount(analytics?.totalViews || 0)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Total Likes</span>
                      <span className="text-2xl font-bold">{formatCount(analytics?.totalLikes || 0)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Total Videos</span>
                      <span className="text-2xl font-bold">{formatCount(analytics?.totalVideos || 0)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Subscribers</span>
                      <span className="text-2xl font-bold">{formatCount(analytics?.totalSubscribers || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-background/60">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Views</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold">{formatCount(analytics?.totalViews || 0)}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      <p className="text-xs text-green-500">+5.2%</p>
                      <p className="text-xs text-muted-foreground ml-1">from last month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/60">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <ThumbsUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Likes</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold">{formatCount(analytics?.totalLikes || 0)}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      <p className="text-xs text-green-500">+12.3%</p>
                      <p className="text-xs text-muted-foreground ml-1">from last month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/60">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Subscribers</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold">{formatCount(analytics?.totalSubscribers || 0)}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      <p className="text-xs text-green-500">+3.7%</p>
                      <p className="text-xs text-muted-foreground ml-1">from last month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/60">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold">{formatCount(engagement)}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      <p className="text-xs text-green-500">+8.1%</p>
                      <p className="text-xs text-muted-foreground ml-1">from last month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Views Over Time</CardTitle>
                  <CardDescription>Daily video views trend for the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={viewsData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} width={40} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'var(--background)', 
                          borderColor: 'var(--border)',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                        labelStyle={{ fontWeight: 'bold' }}
                        formatter={(value) => [`${value} views`, 'Views']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="var(--primary)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Categories</CardTitle>
                  <CardDescription>Most viewed video categories</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'var(--background)', 
                          borderColor: 'var(--border)',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                        formatter={(value) => [`${value} views`, 'Views']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Videos Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Videos</CardTitle>
                <CardDescription>Your most viewed and liked content</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVideos ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : videos && videos.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Likes</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead className="text-right">Posted Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos.sort((a, b) => {
                          // Sort by views in descending order
                          return (b.views || 0) - (a.views || 0);
                        })
                        .slice(0, 5)
                        .map((video) => (
                          <TableRow key={video.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded overflow-hidden mr-3 bg-muted flex-shrink-0">
                                  {video.thumbnailPath ? (
                                    <img 
                                      src={video.thumbnailPath} 
                                      alt={video.title} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <Video className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium truncate max-w-[200px]">
                                    {truncateString(video.title, 30)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {video.categories && video.categories.length > 0
                                      ? video.categories.join(", ")
                                      : "No categories"}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatCount(video.views || 0)}</TableCell>
                            <TableCell className="text-right">{formatCount(video.likes || 0)}</TableCell>
                            <TableCell className="text-right">{formatDuration(video.duration || 0)}</TableCell>
                            <TableCell className="text-right">{formatDate(video.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p>No videos uploaded yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation("/upload")}
                    >
                      <ArrowUpFromLine className="mr-2 h-4 w-4" />
                      Upload a Video
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {/* Content tab implementation (to be built out more) */}
            <Card>
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>Analyze and manage your videos, playlists, and shorts</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">This section will allow you to manage your content, analyze performance, and make adjustments to optimize engagement.</p>
                
                <Button variant="outline" onClick={() => setLocation(`/my-channel/${selectedChannelId}`)}>
                  Go to Channel Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            {/* Audience tab implementation (to be built out more) */}
            <Card>
              <CardHeader>
                <CardTitle>Audience Insights</CardTitle>
                <CardDescription>Understand your viewers and subscribers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">This section will show you demographic information, interests, and viewing habits of your audience.</p>
                
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Audience insights coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            {/* Revenue tab implementation (to be built out more) */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Monetization</CardTitle>
                <CardDescription>Track earnings and optimize monetization</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">This section will help you track ad revenue, manage monetization settings, and explore new income opportunities.</p>
                
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Revenue tracking coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Settings tab implementation (to be built out more) */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Settings</CardTitle>
                <CardDescription>Configure your channel preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">This section will allow you to manage your channel settings, branding, and content preferences.</p>
                
                <Button variant="outline" onClick={() => setLocation(`/my-channels`)}>
                  Manage Your Channels
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}