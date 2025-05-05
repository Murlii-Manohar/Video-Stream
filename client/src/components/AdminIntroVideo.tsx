import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoIcon, UploadIcon, CheckIcon, XIcon } from "lucide-react";

export function AdminIntroVideo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch current site settings
  const { data: siteSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/site-settings'],
    onSuccess: (data) => {
      if (data && data.introVideoUrl) {
        setVideoUrl(data.introVideoUrl);
      }
    }
  });

  // Mutation to update site settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const res = await apiRequest('PUT', '/api/admin/site-settings', settings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/site-settings'] });
      toast({
        title: "Settings Updated",
        description: "The intro video settings have been updated.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle intro video enabled/disabled
  const handleToggleIntroVideo = () => {
    updateSettingsMutation.mutate({
      introVideoEnabled: !siteSettings?.introVideoEnabled
    });
  };

  // Save the video URL
  const handleSaveVideoUrl = () => {
    if (!videoUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    updateSettingsMutation.mutate({
      introVideoUrl: videoUrl,
      introVideoEnabled: true
    });
  };

  // Upload the video file
  const handleUploadVideo = async () => {
    if (!videoFile) {
      toast({
        title: "No File Selected",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      
      const res = await fetch('/api/admin/upload-intro-video', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Failed to upload video');
      }
      
      const data = await res.json();
      
      updateSettingsMutation.mutate({
        introVideoUrl: data.filePath,
        introVideoDuration: data.duration || 0,
        introVideoEnabled: true
      });
      
      setVideoFile(null);
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid video file",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intro Video Settings</CardTitle>
        <CardDescription>
          Configure an intro video that will play at the start of every video on your site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="intro-video-toggle" className="text-base">Enable Intro Video</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, your intro video will play before all videos on the site
            </p>
          </div>
          <Switch
            id="intro-video-toggle"
            checked={siteSettings?.introVideoEnabled || false}
            onCheckedChange={handleToggleIntroVideo}
            disabled={isLoading || updateSettingsMutation.isPending}
          />
        </div>

        {siteSettings?.introVideoUrl && (
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">Current Intro Video</h3>
            <div className="aspect-video bg-muted rounded-md relative overflow-hidden">
              <video 
                src={siteSettings.introVideoUrl} 
                controls
                className="w-full h-full"
                poster="/placeholder-video.png"
              />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Duration: {siteSettings.introVideoDuration ? `${Math.floor(siteSettings.introVideoDuration / 60)}:${String(siteSettings.introVideoDuration % 60).padStart(2, '0')}` : 'Unknown'}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="video-url">Video URL</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                id="video-url"
                placeholder="https://example.com/intro.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={updateSettingsMutation.isPending}
              />
              <Button 
                onClick={handleSaveVideoUrl}
                disabled={!videoUrl || updateSettingsMutation.isPending}
              >
                Save URL
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <Label>Upload Video</Label>
            <div className="mt-1.5">
              <div className="flex items-center gap-2">
                <Input
                  id="intro-video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={uploading || updateSettingsMutation.isPending}
                  className="flex-1"
                />
                <Button 
                  onClick={handleUploadVideo}
                  disabled={!videoFile || uploading || updateSettingsMutation.isPending}
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin mr-2">
                        <VideoIcon className="h-4 w-4" />
                      </span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
              {videoFile && (
                <div className="text-sm text-muted-foreground mt-1">
                  Selected: {videoFile.name} ({Math.round(videoFile.size / 1024 / 1024 * 10) / 10} MB)
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 flex flex-col items-start px-6 py-4">
        <h3 className="font-medium mb-2">Recommendations</h3>
        <ul className="text-sm space-y-1">
          <li className="flex items-center">
            <CheckIcon className="h-4 w-4 text-green-500 mr-2" />
            Keep your intro video short (5-10 seconds)
          </li>
          <li className="flex items-center">
            <CheckIcon className="h-4 w-4 text-green-500 mr-2" />
            Use MP4 format for maximum compatibility
          </li>
          <li className="flex items-center">
            <CheckIcon className="h-4 w-4 text-green-500 mr-2" />
            Include your site branding and logo
          </li>
          <li className="flex items-center">
            <XIcon className="h-4 w-4 text-red-500 mr-2" />
            Avoid long intros as they may cause viewers to leave
          </li>
        </ul>
      </CardFooter>
    </Card>
  );
}