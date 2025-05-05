import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageIcon, Loader2 } from "lucide-react";
import { Channel } from "@shared/schema";

interface ChannelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelToEdit?: Channel;
  onSuccess?: (channel: Channel) => void;
}

export default function ChannelForm({
  open,
  onOpenChange,
  channelToEdit,
  onSuccess,
}: ChannelFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Reset form when dialog opens/closes or channelToEdit changes
  useEffect(() => {
    if (open) {
      if (channelToEdit) {
        setName(channelToEdit.name || "");
        setDescription(channelToEdit.description || "");
        setImagePreview(channelToEdit.bannerImage || null);
      } else {
        setName("");
        setDescription("");
        setBannerImage(null);
        setImagePreview(null);
      }
    }
  }, [open, channelToEdit]);

  const channelMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const url = channelToEdit 
        ? `/api/channels/${channelToEdit.id}` 
        : "/api/channels";
      const method = channelToEdit ? "PATCH" : "POST";
      
      const response = await apiRequest(method, url, formData, { 
        isFormData: true 
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels/user"] });
      if (channelToEdit) {
        queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelToEdit.id}`] });
      }
      
      onOpenChange(false);
      toast({
        title: channelToEdit ? "Channel updated" : "Channel created",
        description: channelToEdit 
          ? "Your channel has been updated successfully" 
          : "Your channel has been created successfully",
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      toast({
        title: channelToEdit ? "Failed to update channel" : "Failed to create channel",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Channel name required",
        description: "Please provide a name for your channel",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    
    if (bannerImage) {
      formData.append("bannerImage", bannerImage);
    }
    
    channelMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{channelToEdit ? "Edit Channel" : "Create a New Channel"}</DialogTitle>
          <DialogDescription>
            {channelToEdit 
              ? "Update your channel details below." 
              : "Fill in the details below to create your channel."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Banner image upload */}
          <div className="space-y-2">
            <Label htmlFor="banner-image">Channel Banner</Label>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => document.getElementById("banner-image")?.click()}
            >
              {imagePreview ? (
                <div className="relative aspect-[16/3] rounded-md overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Banner preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload a banner image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended size: 1280×380 pixels
                  </p>
                </div>
              )}
              <input 
                type="file" 
                id="banner-image" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
          </div>
          
          {/* Channel name */}
          <div className="space-y-2">
            <Label htmlFor="channel-name" className="required">Channel Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your channel name"
              required
            />
          </div>
          
          {/* Channel description */}
          <div className="space-y-2">
            <Label htmlFor="channel-description">Channel Description</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a description of your channel"
              rows={5}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={channelMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!name.trim() || channelMutation.isPending}
            >
              {channelMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {channelToEdit ? "Update Channel" : "Create Channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}