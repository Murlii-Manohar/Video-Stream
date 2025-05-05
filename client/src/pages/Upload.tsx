import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, UploadIcon, ImageIcon, Video } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Define the schema for video upload form
const uploadFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }).max(100, { message: "Title must be at most 100 characters" }),
  description: z.string().max(500, { message: "Description must be at most 500 characters" }).optional(),
  isQuickie: z.boolean().default(false),
  category: z.string().optional(),
  tags: z.string().optional(),
  isPublished: z.boolean().default(true),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function Upload() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const videoFileRef = useRef<HTMLInputElement>(null);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  // Query to check if user has channels
  const { data: channels, isLoading: isLoadingChannels } = useQuery<any[]>({
    queryKey: ['/api/channels/user'],
    enabled: !!user,
  });
  
  // Form definition
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      isQuickie: false,
      category: "uncategorized",
      tags: "",
      isPublished: true,
    },
  });
  
  // Watch for isQuickie changes to validate video duration
  const isQuickie = form.watch("isQuickie");
  
  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 500);
      
      try {
        const response = await apiRequest("POST", "/api/videos", undefined, formData);
        clearInterval(progressInterval);
        setUploadProgress(100);
        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Video uploaded successfully!",
        description: "Your video is now being processed.",
      });
      setTimeout(() => navigate(`/watch?v=${data.id}`), 2000);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });
  
  // Handle video file change
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setVideoFile(file);
    
    // Create a preview URL
    const videoUrl = URL.createObjectURL(file);
    setVideoPreview(videoUrl);
    
    // Get video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      
      // Auto set isQuickie if video is less than 2 minutes
      if (video.duration <= 120) {
        form.setValue("isQuickie", true);
      } else if (isQuickie) {
        // If current selection is quickie but video is too long, show warning
        toast({
          title: "Video too long for Quickie",
          description: "Quickies must be 2 minutes or less. This video will be uploaded as a regular video.",
          variant: "destructive",
        });
        form.setValue("isQuickie", false);
      }
      
      URL.revokeObjectURL(videoUrl);
    };
    video.src = videoUrl;
    
    // Set title from filename if empty
    if (!form.getValues("title")) {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      form.setValue("title", fileName);
    }
  };
  
  // Handle thumbnail file change
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file for the thumbnail",
        variant: "destructive",
      });
      return;
    }
    
    setThumbnailFile(file);
    
    // Create a preview URL
    const imageUrl = URL.createObjectURL(file);
    setThumbnailPreview(imageUrl);
  };
  
  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle form submission
  const onSubmit = (values: UploadFormValues) => {
    if (!videoFile) {
      toast({
        title: "No video selected",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }
    
    // Quickie validation
    if (values.isQuickie && videoDuration && videoDuration > 120) {
      toast({
        title: "Video too long for Quickie",
        description: "Quickies must be 2 minutes or less",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("videoFile", videoFile);
    
    if (thumbnailFile) {
      formData.append("thumbnailFile", thumbnailFile);
    }
    
    // Append form values
    Object.entries(values).forEach(([key, value]) => {
      if (key === "tags" && typeof value === "string") {
        // Convert tags string to array
        formData.append(key, value);
      } else {
        formData.append(key, value?.toString() || "");
      }
    });
    
    // Add additional metadata
    if (videoDuration) {
      formData.append("duration", Math.floor(videoDuration).toString());
    }
    
    uploadMutation.mutate(formData);
  };
  
  // Check user authentication
  if (!user) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You need to be logged in to upload videos</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Check if user has channels
  if (!isLoadingChannels && (!channels || channels.length === 0)) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Channel Required</CardTitle>
            <CardDescription>You need to create a channel before uploading videos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              To upload videos on XPlayHD, you need to create at least one channel. Channels allow you to organize your content and build a following.
            </p>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={() => navigate("/my-channels/create")}>Create a Channel</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Go to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
          <CardDescription>Share your video with the XPlayHD community</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Video File Upload */}
          <div className="mb-6">
            <Label className="block text-sm font-medium mb-2">Video File</Label>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${videoFile ? 'border-primary' : 'border-muted-foreground/25'}`}>
              {!videoFile ? (
                <div>
                  <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Drag and drop your video file here or click to browse</p>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => videoFileRef.current?.click()}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" /> Select Video
                  </Button>
                  <input
                    ref={videoFileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoChange}
                  />
                </div>
              ) : (
                <div>
                  {videoPreview && (
                    <video 
                      src={videoPreview} 
                      controls 
                      className="max-h-64 mx-auto mb-3 rounded"
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{videoFile.name}</p>
                      <p className="text-muted-foreground">
                        {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • 
                        {videoDuration && ` ${formatDuration(videoDuration)} • `}
                        {videoFile.type}
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => videoFileRef.current?.click()}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Thumbnail File Upload */}
          <div className="mb-6">
            <Label className="block text-sm font-medium mb-2">Thumbnail Image (Optional)</Label>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${thumbnailFile ? 'border-primary' : 'border-muted-foreground/25'}`}>
              {!thumbnailFile ? (
                <div>
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Upload a custom thumbnail for your video</p>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => thumbnailFileRef.current?.click()}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" /> Select Image
                  </Button>
                  <input
                    ref={thumbnailFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailChange}
                  />
                </div>
              ) : (
                <div>
                  {thumbnailPreview && (
                    <img 
                      src={thumbnailPreview} 
                      alt="Thumbnail preview" 
                      className="max-h-48 mx-auto mb-3 rounded"
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{thumbnailFile.name}</p>
                      <p className="text-muted-foreground">
                        {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB • 
                        {thumbnailFile.type}
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => thumbnailFileRef.current?.click()}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {isQuickie && videoDuration && videoDuration > 120 && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Video too long for Quickie</AlertTitle>
              <AlertDescription>
                Quickies must be 2 minutes or less. Your video is {formatDuration(videoDuration)} long.
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter video title" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a catchy title that describes your video
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter video description (optional)" 
                        className="resize-none min-h-[100px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide details about your video to help viewers find it
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <RadioGroup 
                        className="grid grid-cols-2 sm:grid-cols-3 gap-2" 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "uncategorized"}
                      >
                        {["Amateur", "Professional", "POV", "Lesbian", "Gay", "Transgender", "Fetish", "BDSM", "Uncategorized"].map((category) => (
                          <div className="flex items-center space-x-2" key={category.toLowerCase()}>
                            <RadioGroupItem value={category.toLowerCase()} id={`category-${category.toLowerCase()}`} />
                            <Label htmlFor={`category-${category.toLowerCase()}`}>{category}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="Separate tags with commas" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Add relevant tags to help users discover your content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex flex-col sm:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="isQuickie"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 flex-1">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Quickie</FormLabel>
                        <FormDescription>
                          Short videos under 2 minutes
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            if (checked && videoDuration && videoDuration > 120) {
                              toast({
                                title: "Video too long for Quickie",
                                description: "Quickies must be 2 minutes or less",
                                variant: "destructive",
                              });
                              return;
                            }
                            field.onChange(checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 flex-1">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Publish Now</FormLabel>
                        <FormDescription>
                          Make video public immediately
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={uploadMutation.isPending || !videoFile}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading... {Math.round(uploadProgress)}%
                  </>
                ) : (
                  <>Upload Video</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}