import React from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, X } from "lucide-react";

interface ChannelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingChannel?: {
    id: number;
    name: string;
    description?: string;
    bannerImage?: string;
  };
}

const channelFormSchema = z.object({
  name: z.string()
    .min(3, "Channel name must be at least 3 characters")
    .max(50, "Channel name cannot exceed 50 characters"),
  description: z.string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
  bannerImage: z.string().optional(),
});

type ChannelFormValues = z.infer<typeof channelFormSchema>;

export default function ChannelForm({ open, onOpenChange, existingChannel }: ChannelFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isEditMode = !!existingChannel;

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: existingChannel?.name || "",
      description: existingChannel?.description || "",
      bannerImage: existingChannel?.bannerImage || "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const createChannelMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/channels", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create channel");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels/user"] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: isEditMode 
          ? "Channel updated successfully" 
          : "Channel created successfully",
      });
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: ChannelFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a channel",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", values.name);
    
    if (values.description) {
      formData.append("description", values.description);
    }
    
    if (selectedFile) {
      formData.append("bannerImage", selectedFile);
    } else if (values.bannerImage) {
      formData.append("bannerImageUrl", values.bannerImage);
    }

    if (existingChannel) {
      formData.append("channelId", existingChannel.id.toString());
      formData.append("_method", "PATCH"); // For method spoofing
    }

    createChannelMutation.mutate(formData);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Channel" : "Create New Channel"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter channel name" {...field} />
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
                      placeholder="Tell viewers about your channel"
                      className="resize-none min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Banner Image</FormLabel>
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="dropzone-file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
                  >
                    {selectedFile ? (
                      <div className="relative w-full h-full p-2">
                        <div className="absolute top-2 right-2 z-10">
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={handleClearFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedFile.name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <UploadCloud className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Click to upload banner image
                        </p>
                      </div>
                    )}
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createChannelMutation.isPending}
              >
                {createChannelMutation.isPending ? "Saving..." : isEditMode ? "Update Channel" : "Create Channel"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}