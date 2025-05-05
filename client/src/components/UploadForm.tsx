import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, X, Film, Smartphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface UploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const uploadFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  categories: z.array(z.string()).min(1, "Please select at least one category"),
  tags: z.string().optional(),
  isQuickie: z.boolean().default(false),
  channelId: z.number().optional(),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function UploadForm({ open, onOpenChange }: UploadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<"video" | "quickie">("video");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // Fetch user's channels
  const { data: channels } = useQuery({
    queryKey: ['/api/channels/user'],
    enabled: !!user,
  });

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      categories: [],
      tags: "",
      isQuickie: false,
      channelId: undefined,
    },
  });

  // Update isQuickie value when upload type changes
  useEffect(() => {
    form.setValue("isQuickie", uploadType === "quickie");
  }, [uploadType, form]);

  // Check video duration when a file is selected
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        setVideoDuration(duration);
        
        // If it's a quickie and longer than 2 minutes, show a warning
        if (uploadType === "quickie" && duration > 120) {
          toast({
            title: "Warning",
            description: "Quickie videos must be 2 minutes or less. This video is too long for a quickie.",
            variant: "destructive",
          });
        }
      };
      
      video.src = URL.createObjectURL(selectedFile);
    }
  }, [selectedFile, uploadType, toast]);

  const uploadVideoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/videos", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.message || "Failed to upload video";
        
        // Check if we have detailed validation errors
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map((err: any) => err.message).join(", ");
        }
        
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/quickies"] });
      handleReset();
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Your video has been uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload video",
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    form.reset();
    setUploading(false);
    setUploadProgress(0);
    setVideoDuration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: UploadFormValues) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }
    
    // Validate quickie duration
    if (values.isQuickie && videoDuration && videoDuration > 120) {
      toast({
        title: "Error",
        description: "Quickie videos must be 2 minutes or less. Please upload a shorter video or select 'Regular Video' option.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate channel selection - channel is now required
    if (!values.channelId) {
      toast({
        title: "Error",
        description: "Please select a channel for your video. You must have a channel to upload content.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    // Prepare form data
    const formData = new FormData();
    formData.append("videoFile", selectedFile);
    formData.append("title", values.title);
    formData.append("description", values.description || "");
    // Add categories as JSON array
    formData.append("categories", JSON.stringify(values.categories));
    // Convert tags to a string (it will be parsed back to array on the server)
    formData.append("tags", values.tags || "");
    formData.append("isQuickie", values.isQuickie.toString());
    formData.append("channelId", values.channelId.toString());
    
    // Simulate upload progress (in a real app, this would be from actual upload progress)
    const simulateProgress = () => {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);
      
      return interval;
    };
    
    const progressInterval = simulateProgress();
    
    try {
      await uploadVideoMutation.mutateAsync(formData);
      setUploadProgress(100);
    } finally {
      clearInterval(progressInterval);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-4">Upload Content</DialogTitle>
          <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as "video" | "quickie")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="video" className="flex items-center justify-center">
                <Film className="mr-2 h-4 w-4" />
                Regular Video
              </TabsTrigger>
              <TabsTrigger value="quickie" className="flex items-center justify-center">
                <Smartphone className="mr-2 h-4 w-4" />
                Quickie
              </TabsTrigger>
            </TabsList>
            <TabsContent value="video">
              <div className="text-sm text-muted-foreground mb-4">
                <p>Upload a regular video with 16:9 aspect ratio (any length)</p>
              </div>
            </TabsContent>
            <TabsContent value="quickie">
              <div className="text-sm text-muted-foreground mb-4">
                <p>Upload a vertical short video (max 2 minutes, 9:16 aspect ratio)</p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogHeader>
        
        {!selectedFile ? (
          <div 
            className="mb-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="mb-4">
              {uploadType === "video" 
                ? "Drag and drop your video file here (16:9 ratio recommended)" 
                : "Drag and drop your quickie video (vertical 9:16 ratio, max 2 minutes)"}
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Select File
            </Button>
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleFileSelect}
            />
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              {uploadType === "video" 
                ? "Max file size: 5GB" 
                : "Max duration: 2 minutes, Max file size: 500MB"}
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mr-3">
                  <video className="h-16 w-28 object-cover rounded">
                    <source src={URL.createObjectURL(selectedFile)} type={selectedFile.type} />
                  </video>
                </div>
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    {videoDuration && ` • ${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toString().padStart(2, '0')}`}
                  </p>
                  {uploadType === "quickie" && videoDuration && videoDuration > 120 && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ This video exceeds the 2-minute limit for quickies
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {uploading && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-16">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Add a title that describes your video" {...field} />
                      </FormControl>
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
                          placeholder="Tell viewers about your video" 
                          rows={4} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {channels && channels.length > 0 && (
                  <FormField
                    control={form.control}
                    name="channelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a channel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {channels.map((channel: any) => (
                              <SelectItem key={channel.id} value={channel.id.toString()}>
                                {channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose which channel to upload this content to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories</FormLabel>
                      <FormDescription>
                        Select one or more categories that apply to your video
                      </FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-[200px] overflow-y-auto pr-1">
                        {[
                          "Teen", 
                          "MILF", 
                          "Stepmom", 
                          "Ebony", 
                          "Black", 
                          "Asian", 
                          "Indian", 
                          "Amateur", 
                          "Professional",
                          "Verified Models", 
                          "Anal", 
                          "Threesome", 
                          "Lesbian",
                          "Cheating",
                          "Couples",
                          "Solo"
                        ].map((category) => (
                          <FormItem
                            key={category}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-2"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(category)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, category]);
                                  } else {
                                    field.onChange(
                                      field.value?.filter(
                                        (value) => value !== category
                                      )
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {category}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </div>
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
                        <Input placeholder="Add tags separated by commas" {...field} />
                      </FormControl>
                      <FormDescription>
                        Helps viewers find your content through search
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-background">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={uploading || (uploadType === "quickie" && videoDuration && videoDuration > 120)}
                  >
                    {uploading ? `Uploading (${uploadProgress}%)` : "Upload"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
