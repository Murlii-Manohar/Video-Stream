import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function AdminAdManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Site ads state
  const [siteAdsEnabled, setSiteAdsEnabled] = useState(false);
  const [adUrl, setAdUrl] = useState("");
  const [adPosition, setAdPosition] = useState("header");
  const [siteAdUrls, setSiteAdUrls] = useState<string[]>([]);
  const [siteAdPositions, setSiteAdPositions] = useState<string[]>([]);

  // Video ads state
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [videoAdUrl, setVideoAdUrl] = useState("");
  const [videoAdStartTime, setVideoAdStartTime] = useState("");
  const [videoHasAds, setVideoHasAds] = useState(false);

  // Fetch site ad settings
  const { data: siteAdSettings, isLoading: isLoadingSiteAds } = useQuery({
    queryKey: ['/api/admin/ads/site'],
    queryFn: async () => {
      const res = await fetch('/api/admin/ads/site');
      if (!res.ok) throw new Error('Failed to fetch site ad settings');
      return res.json();
    },
    onSuccess: (data) => {
      setSiteAdsEnabled(data.siteAdsEnabled);
      setSiteAdUrls(data.siteAdUrls || []);
      setSiteAdPositions(data.siteAdPositions || []);
    },
    onError: (error: Error) => {
      toast({
        title: "Error fetching site ad settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Fetch videos for ad management
  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['/api/videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    }
  });

  // Update site ad settings mutation
  const updateSiteAdsMutation = useMutation({
    mutationFn: async (data: { siteAdsEnabled: boolean; siteAdUrls: string[]; siteAdPositions: string[] }) => {
      const res = await apiRequest('POST', '/api/admin/ads/site', data);
      if (!res.ok) throw new Error('Failed to update site ad settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads/site'] });
      toast({
        title: "Ad settings updated",
        description: "Site-wide ad settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update ad settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle video ads mutation
  const toggleVideoAdsMutation = useMutation({
    mutationFn: async ({ videoId, hasAds, adUrl, adStartTime }: { videoId: number; hasAds: boolean; adUrl?: string; adStartTime?: string }) => {
      const res = await apiRequest('POST', `/api/admin/ads/videos/${videoId}`, { hasAds, adUrl, adStartTime });
      if (!res.ok) throw new Error('Failed to update video ad settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video ad settings updated",
        description: "Video ad settings have been updated successfully.",
      });
      setSelectedVideo(null);
      setVideoAdUrl("");
      setVideoAdStartTime("");
      setVideoHasAds(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update video ad settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add site ad
  const handleAddSiteAd = () => {
    if (!adUrl) {
      toast({
        title: "Missing information",
        description: "Please provide an ad URL.",
        variant: "destructive",
      });
      return;
    }

    const newAdUrls = [...siteAdUrls, adUrl];
    const newAdPositions = [...siteAdPositions, adPosition];
    
    setSiteAdUrls(newAdUrls);
    setSiteAdPositions(newAdPositions);
    setAdUrl("");
    
    // Save changes
    updateSiteAdsMutation.mutate({
      siteAdsEnabled,
      siteAdUrls: newAdUrls,
      siteAdPositions: newAdPositions
    });
  };

  // Remove site ad
  const handleRemoveSiteAd = (index: number) => {
    const newAdUrls = [...siteAdUrls];
    const newAdPositions = [...siteAdPositions];
    
    newAdUrls.splice(index, 1);
    newAdPositions.splice(index, 1);
    
    setSiteAdUrls(newAdUrls);
    setSiteAdPositions(newAdPositions);
    
    // Save changes
    updateSiteAdsMutation.mutate({
      siteAdsEnabled,
      siteAdUrls: newAdUrls,
      siteAdPositions: newAdPositions
    });
  };

  // Toggle site ads
  const handleToggleSiteAds = (enabled: boolean) => {
    setSiteAdsEnabled(enabled);
    
    // Save changes
    updateSiteAdsMutation.mutate({
      siteAdsEnabled: enabled,
      siteAdUrls,
      siteAdPositions
    });
  };

  // Handle video selection for ad management
  const handleVideoSelect = (video: any) => {
    setSelectedVideo(video.id);
    setVideoHasAds(video.hasAds || false);
    setVideoAdUrl(video.adUrl || "");
    setVideoAdStartTime(video.adStartTime ? String(video.adStartTime) : "");
  };

  // Save video ad settings
  const handleSaveVideoAds = () => {
    if (!selectedVideo) return;

    toggleVideoAdsMutation.mutate({
      videoId: selectedVideo,
      hasAds: videoHasAds,
      adUrl: videoHasAds ? videoAdUrl : undefined,
      adStartTime: videoHasAds && videoAdStartTime ? videoAdStartTime : undefined
    });
  };

  if (isLoadingSiteAds || isLoadingVideos) {
    return <div className="flex justify-center items-center p-8">Loading ad management...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="site-ads">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="site-ads">Site-wide Ads</TabsTrigger>
          <TabsTrigger value="video-ads">Video Ads</TabsTrigger>
        </TabsList>
        
        {/* Site-wide Ads Tab */}
        <TabsContent value="site-ads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Site-wide Advertisement Settings</CardTitle>
              <CardDescription>
                Configure ads that will display across the entire platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="site-ads-toggle"
                  checked={siteAdsEnabled}
                  onCheckedChange={handleToggleSiteAds}
                />
                <Label htmlFor="site-ads-toggle">Enable site-wide advertisements</Label>
              </div>
              
              {siteAdsEnabled && (
                <>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-7">
                        <Label htmlFor="ad-url">Ad URL (image or script)</Label>
                        <Input
                          id="ad-url"
                          placeholder="https://example.com/ad.jpg or ad script URL"
                          value={adUrl}
                          onChange={(e) => setAdUrl(e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label htmlFor="ad-position">Position</Label>
                        <select
                          id="ad-position"
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={adPosition}
                          onChange={(e) => setAdPosition(e.target.value)}
                        >
                          <option value="header">Header</option>
                          <option value="sidebar">Sidebar</option>
                          <option value="footer">Footer</option>
                          <option value="between-videos">Between Videos</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button onClick={handleAddSiteAd} className="w-full">
                          <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>
                    </div>

                    {siteAdUrls.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ad URL</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {siteAdUrls.map((url, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{url}</TableCell>
                              <TableCell>{siteAdPositions[index]}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleRemoveSiteAd(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex items-center justify-center p-4 border border-dashed rounded-md">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span>No ads configured. Add one above.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Video Ads Tab */}
        <TabsContent value="video-ads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Advertisement Settings</CardTitle>
              <CardDescription>
                Configure ads for specific videos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-4 border-r pr-4">
                  <h3 className="text-lg font-medium">Select a Video</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {videos && videos.length > 0 ? (
                      videos.map((video: any) => (
                        <div 
                          key={video.id}
                          className={`p-2 cursor-pointer rounded-md hover:bg-accent ${
                            selectedVideo === video.id ? "bg-accent" : ""
                          }`}
                          onClick={() => handleVideoSelect(video)}
                        >
                          <div className="font-medium truncate">{video.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {video.hasAds ? "Has ads" : "No ads"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-sm">No videos available</div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  {selectedVideo ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="video-ads-toggle"
                          checked={videoHasAds}
                          onCheckedChange={setVideoHasAds}
                        />
                        <Label htmlFor="video-ads-toggle">Enable ads for this video</Label>
                      </div>
                      
                      {videoHasAds && (
                        <>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="video-ad-url">Ad URL (video or image)</Label>
                              <Input
                                id="video-ad-url"
                                placeholder="https://example.com/ad.mp4"
                                value={videoAdUrl}
                                onChange={(e) => setVideoAdUrl(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="ad-start-time">Start Time (seconds)</Label>
                              <Input
                                id="ad-start-time"
                                type="number"
                                min="0"
                                placeholder="When to show the ad (in seconds)"
                                value={videoAdStartTime}
                                onChange={(e) => setVideoAdStartTime(e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <Button onClick={handleSaveVideoAds}>
                            Save Ad Settings
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 border border-dashed rounded-md">
                      <div className="text-center space-y-2">
                        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">Select a video to manage its ad settings</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}