import React, { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CommentSection } from "@/components/CommentSection";
import { VideoInteractions } from "@/components/VideoInteractions";
import { SubscribeButton } from "@/components/SubscribeButton";
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

interface VideoWithCreator {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  thumbnailPath?: string;
  videoUrl?: string; // Add videoUrl property
  thumbnailUrl?: string; // Add thumbnailUrl property
  views: number;
  likes: number;
  dislikes: number;
  createdAt: string;
  updatedAt: string;
  isQuickie: boolean;
  duration: number;
  categories: string[];
  tags: string[];
  isPublished: boolean;
  hasAds: boolean;
  adUrl?: string;
  adStartTime?: number;
  userLiked?: boolean;
  userDisliked?: boolean;
  isUserSubscribed?: boolean;
  creator: {
    id: number;
    username: string;
    displayName?: string;
    profileImage?: string;
    subscriberCount?: number;
  };
}

export default function Watch() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute<{ id: string }>("/watch/:id");
  const videoId = match ? parseInt(params.id) : null;
  
  // Fetch video details
  const { data: video, isLoading, error } = useQuery<VideoWithCreator>({
    queryKey: videoId ? [`/api/videos/${videoId}`] : [],
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
  
  // Track video view
  useEffect(() => {
    if (videoId) {
      // Record view after a few seconds to ensure actual viewing
      const timer = setTimeout(() => {
        fetch(`/api/videos/${videoId}/view`, { method: 'POST' })
          .catch(err => console.error('Error recording view:', err));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [videoId]);
  
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
            src={video.videoUrl || video.filePath} 
            poster={video.thumbnailUrl || video.thumbnailPath} 
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
            
            {/* Using VideoInteractions component for consistent like/dislike behavior */}
            <VideoInteractions 
              videoId={video.id}
              initialLikes={video.likes || 0}
              initialDislikes={video.dislikes || 0}
              initialUserLiked={video.userLiked}
              initialUserDisliked={video.userDisliked}
            />
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
          <SubscribeButton 
            channelId={video.creator.id} 
            channelName={video.creator.displayName || video.creator.username}
            initialIsSubscribed={video.isUserSubscribed}
          />
        </div>
        
        {/* Comments section */}
        <CommentSection videoId={video.id} />
      </div>
    </div>
  );
}
