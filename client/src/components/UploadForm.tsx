import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { UploadCloud, X } from "lucide-react";

interface UploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const uploadFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  category: z.string().min(1, "Please select a category"),
  tags: z.string().optional(),
  isQuickie: z.boolean().default(false),
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

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tags: "",
      isQuickie: false,
    },
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/videos", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload video");
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
    
    setUploading(true);
    
    // Prepare form data
    const formData = new FormData();
    formData.append("videoFile", selectedFile);
    formData.append("title", values.title);
    formData.append("description", values.description || "");
    formData.append("category", values.category);
    formData.append("tags", values.tags || "");
    formData.append("isQuickie", values.isQuickie.toString());
    
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins font-bold">Upload Video</DialogTitle>
        </DialogHeader>
        
        {!selectedFile ? (
          <div 
            className="mb-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="mb-4">Drag and drop your video file here</p>
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
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Max file size: 5GB</p>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mr-3">
                  <video className="h-16 w-28 object-cover rounded">
                    <source src={URL.createObjectURL(selectedFile)} type={selectedFile.type} />
                  </video>
                </div>
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Amateur">Amateur</SelectItem>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Verified Models">Verified Models</SelectItem>
                          <SelectItem value="Couples">Couples</SelectItem>
                          <SelectItem value="Solo">Solo</SelectItem>
                        </SelectContent>
                      </Select>
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
                
                <FormField
                  control={form.control}
                  name="isQuickie"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 border">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Add to Quickies</FormLabel>
                        <FormDescription>
                          Short format videos (under 60 seconds) for the Quickies section
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    disabled={uploading}
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
