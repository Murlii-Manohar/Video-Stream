import React, { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CommentSection } from "@/components/CommentSection";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Bookmark,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Watch() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute<{ id: string }>("/watch/:id");
  const videoId = match ? parseInt(params.id) : null;
  
  // Fetch video details
  const { data: video, isLoading, error } = useQuery({
    queryKey: videoId ? [`/api/videos/${videoId}`] : null,
    enabled: !!videoId,
  });
  
  // Like video mutation
  const likeVideoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/like`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}`] });
      toast({
        title: "Success",
        description: "Video liked successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to like video",
        variant: "destructive"
      });
    }
  });
  
  // Handle share click
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        toast({
          title: "Link copied",
          description: "Video link copied to clipboard"
        });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive"
        });
      });
  };
  
  // Format date
  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Handle subscribe click
  const handleSubscribe = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to subscribe to this channel",
        variant: "destructive"
      });
      return;
    }
    
    // Subscription logic to be implemented
    toast({
      title: "Subscribed",
      description: `You've subscribed to ${video.creator.displayName || video.creator.username}`
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error || !video) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-0 py-10 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Video Not Found</h2>
        <p className="mb-4">This video may have been removed or is no longer available.</p>
        <Link href="/">
          <Button>Return to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Video Player */}
      <div className="bg-black">
        <div className="max-w-5xl mx-auto aspect-video">
          <VideoPlayer 
            src={video.filePath} 
            poster={video.thumbnailPath} 
          />
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 lg:px-0">
        {/* Video details */}
        <div className="mt-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 className="text-xl md:text-2xl font-bold">{video.title}</h1>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span>{video.views.toLocaleString()} views</span>
              <span className="mx-2">•</span>
              <span>{formatDate(video.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost"
                className="flex items-center space-x-1"
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Login required",
                      description: "Please login to like videos",
                      variant: "destructive"
                    });
                    return;
                  }
                  likeVideoMutation.mutate();
                }}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{video.likes}</span>
              </Button>
              <Button variant="ghost" className="flex items-center space-x-1">
                <ThumbsDown className="h-4 w-4" />
                <span>{video.dislikes}</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-1"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button variant="ghost" className="flex items-center space-x-1">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Channel information */}
        <div className="flex items-start justify-between py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <Link href={`/channel/${video.creator.id}`}>
              <a>
                <Avatar className="w-12 h-12 mr-3">
                  <AvatarImage 
                    src={video.creator.profileImage || ""} 
                    alt={video.creator.displayName || video.creator.username} 
                  />
                  <AvatarFallback className="bg-primary text-white">
                    {video.creator.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </a>
            </Link>
            <div>
              <h3 className="font-medium">
                <Link href={`/channel/${video.creator.id}`}>
                  <a>{video.creator.displayName || video.creator.username}</a>
                </Link>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {video.creator.subscriberCount?.toLocaleString() || 0} subscribers
              </p>
              {video.description && (
                <p className="mt-2 text-sm line-clamp-2 md:line-clamp-none">
                  {video.description}
                </p>
              )}
            </div>
          </div>
          <Button 
            onClick={handleSubscribe}
            variant="default"
            className="bg-primary text-white"
          >
            Subscribe
          </Button>
        </div>
        
        {/* Comments section */}
        <CommentSection videoId={video.id} />
      </div>
    </div>
  );
}
