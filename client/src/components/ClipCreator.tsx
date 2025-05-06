import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Slider
} from '@/components/ui/slider';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Textarea 
} from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Copy, 
  Share2, 
  Scissors, 
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ClipCreatorProps {
  videoId: number;
  videoUrl: string;
  currentTime: number;
  duration: number;
  isOpen: boolean;
  onClose: () => void;
}

type SocialPlatform = 'twitter' | 'facebook' | 'instagram';

const ClipCreator: React.FC<ClipCreatorProps> = ({
  videoId,
  videoUrl,
  currentTime,
  duration,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [clipCreated, setClipCreated] = useState(false);
  const [clipUrl, setClipUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | ''>('');
  
  // Default clip duration is 15 seconds
  const defaultClipDuration = 15;
  
  // Start time is the current time minus half the clip duration, but not less than 0
  const defaultStartTime = Math.max(0, currentTime - (defaultClipDuration / 2));
  
  // End time is start time plus clip duration, but not more than the video duration
  const defaultEndTime = Math.min(duration, defaultStartTime + defaultClipDuration);
  
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStartTimeChange = (value: number[]) => {
    const newStartTime = value[0];
    if (newStartTime < endTime - 1) { // Ensure at least 1 second of video
      setStartTime(newStartTime);
    }
  };

  const handleEndTimeChange = (value: number[]) => {
    const newEndTime = value[0];
    if (newEndTime > startTime + 1) { // Ensure at least 1 second of video
      setEndTime(newEndTime);
    }
  };

  const updateVideoPreviewTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleCreateClip = async () => {
    if (!title) {
      toast({
        title: "Title required",
        description: "Please enter a title for your clip",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      
      const response = await apiRequest('POST', '/api/clips', {
        videoId,
        title,
        description,
        startTime,
        endTime
      });
      
      if (!response.ok) {
        throw new Error('Failed to create clip');
      }
      
      const data = await response.json();
      setClipUrl(data.clipUrl);
      setClipCreated(true);
      
      toast({
        title: "Clip created!",
        description: "Your clip is ready to share",
      });
    } catch (error) {
      toast({
        title: "Error creating clip",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareToSocial = async (platform: SocialPlatform) => {
    if (!clipCreated || !clipUrl) {
      toast({
        title: "No clip to share",
        description: "Please create a clip first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSharing(true);
      setSelectedPlatform(platform);
      
      // Prepare share content
      const shareText = `${title}${description ? ` - ${description}` : ''}`;
      let shareUrl;
      
      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(clipUrl)}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(clipUrl)}&quote=${encodeURIComponent(shareText)}`;
          break;
        case 'instagram':
          // Instagram doesn't have a web sharing API, so we'll just copy the link
          await navigator.clipboard.writeText(clipUrl);
          toast({
            title: "Link copied!",
            description: "Open Instagram and paste the link to share your clip",
          });
          setIsSharing(false);
          return;
        default:
          throw new Error('Unknown platform');
      }
      
      // Open share dialog in a new window
      window.open(shareUrl, '_blank', 'width=600,height=400');
      
      // Log the share
      await apiRequest('POST', '/api/clips/share', {
        clipId: videoId, // This should be the clip ID in a real implementation
        platform
      });
      
      toast({
        title: "Shared successfully!",
        description: `Your clip has been shared to ${platform}`,
      });
    } catch (error) {
      toast({
        title: "Error sharing",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
      setSelectedPlatform('');
    }
  };

  const handleCopyLink = async () => {
    if (!clipCreated || !clipUrl) {
      toast({
        title: "No clip to share",
        description: "Please create a clip first",
        variant: "destructive"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(clipUrl);
      toast({
        title: "Link copied!",
        description: "Clip link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error copying link",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime(defaultStartTime);
    setEndTime(defaultEndTime);
    setClipCreated(false);
    setClipUrl('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            {clipCreated ? 'Share Your Clip' : 'Create Video Clip'}
          </DialogTitle>
          <DialogDescription>
            {clipCreated 
              ? 'Your clip is ready to share with others!' 
              : 'Select the start and end time to create a short clip.'}
          </DialogDescription>
        </DialogHeader>
        
        {!clipCreated ? (
          <>
            {/* Video Preview */}
            <div className="aspect-video bg-black rounded-md overflow-hidden">
              <video 
                ref={videoRef}
                src={videoUrl} 
                className="w-full h-full"
                controls
                controlsList="nodownload nofullscreen"
              />
            </div>
            
            {/* Clip Range Controls */}
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Start Time: {startTime.toFixed(1)}s</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => updateVideoPreviewTime(startTime)}
                  >
                    Preview
                  </Button>
                </div>
                <Slider 
                  value={[startTime]} 
                  max={duration} 
                  step={0.1} 
                  onValueChange={handleStartTimeChange} 
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>End Time: {endTime.toFixed(1)}s</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => updateVideoPreviewTime(endTime)}
                  >
                    Preview
                  </Button>
                </div>
                <Slider 
                  value={[endTime]} 
                  max={duration} 
                  step={0.1} 
                  onValueChange={handleEndTimeChange} 
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                Clip duration: {(endTime - startTime).toFixed(1)} seconds
              </div>
            </div>
            
            {/* Clip Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Clip Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your clip a catchy title"
                  maxLength={100}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a short description for your clip"
                  maxLength={280}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateClip} 
                disabled={isCreating || !title}
              >
                {isCreating ? 'Creating...' : 'Create Clip'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Share Options */}
            <div className="space-y-6">
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm font-medium mb-1">Your clip is ready!</p>
                <p className="text-sm text-muted-foreground mb-3 break-all">{clipUrl}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-medium">Share to social media</p>
                <div className="grid grid-cols-3 gap-3">
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center justify-center h-20"
                    onClick={() => handleShareToSocial('twitter')}
                    disabled={isSharing && selectedPlatform === 'twitter'}
                  >
                    {isSharing && selectedPlatform === 'twitter' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    ) : (
                      <Twitter className="h-8 w-8 mb-1 text-[#1DA1F2]" />
                    )}
                    <span className="text-xs">Twitter</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center justify-center h-20"
                    onClick={() => handleShareToSocial('facebook')}
                    disabled={isSharing && selectedPlatform === 'facebook'}
                  >
                    {isSharing && selectedPlatform === 'facebook' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    ) : (
                      <Facebook className="h-8 w-8 mb-1 text-[#4267B2]" />
                    )}
                    <span className="text-xs">Facebook</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center justify-center h-20"
                    onClick={() => handleShareToSocial('instagram')}
                    disabled={isSharing && selectedPlatform === 'instagram'}
                  >
                    {isSharing && selectedPlatform === 'instagram' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    ) : (
                      <Instagram className="h-8 w-8 mb-1 text-[#E1306C]" />
                    )}
                    <span className="text-xs">Instagram</span>
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button 
                variant="default"
                onClick={resetForm}
              >
                Create Another Clip
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClipCreator;