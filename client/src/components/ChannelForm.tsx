import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CameraIcon } from "lucide-react";

interface ChannelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingChannel?: any;
}

export default function ChannelForm({ open, onOpenChange, existingChannel }: ChannelFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  
  useEffect(() => {
    if (existingChannel) {
      setName(existingChannel.name || "");
      setDescription(existingChannel.description || "");
      
      if (existingChannel.bannerImage) {
        setBannerPreview(existingChannel.bannerImage);
      }
    } else {
      // Reset form for new channel
      setName("");
      setDescription("");
      setBannerImage(null);
      setBannerPreview("");
    }
  }, [existingChannel, open]);
  
  const createChannelMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest(
        existingChannel ? "PATCH" : "POST",
        existingChannel ? `/api/channels/${existingChannel.id}` : "/api/channels",
        formData,
        { isFormData: true }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels/user'] });
      onOpenChange(false);
      toast({
        title: existingChannel ? "Channel updated" : "Channel created",
        description: existingChannel 
          ? "Your channel has been updated successfully" 
          : "Your channel has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: existingChannel ? "Update failed" : "Creation failed",
        description: error instanceof Error ? error.message : "Failed to save channel",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Validation error",
        description: "Channel name is required",
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
    
    createChannelMutation.mutate(formData);
  };
  
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerImage(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingChannel ? "Edit Channel" : "Create New Channel"}</DialogTitle>
          <DialogDescription>
            {existingChannel 
              ? "Update your channel details to better represent your content" 
              : "Create a channel to start uploading and sharing your videos"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name *</Label>
              <Input
                id="channel-name"
                placeholder="Enter channel name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="channel-description">Description</Label>
              <Textarea
                id="channel-description"
                placeholder="Describe your channel content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <div 
                className="border-2 border-dashed rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer relative"
                onClick={() => document.getElementById('banner-upload')?.click()}
              >
                {bannerPreview ? (
                  <div className="relative">
                    <img 
                      src={bannerPreview} 
                      alt="Banner preview" 
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                      <CameraIcon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <CameraIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload a banner image</p>
                    <p className="text-xs text-muted-foreground">Recommended size: 1200 x 300 pixels</p>
                  </div>
                )}
                <input
                  type="file"
                  id="banner-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleBannerChange}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createChannelMutation.isPending}
            >
              {createChannelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingChannel ? "Updating..." : "Creating..."}
                </>
              ) : (
                existingChannel ? "Update Channel" : "Create Channel"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}