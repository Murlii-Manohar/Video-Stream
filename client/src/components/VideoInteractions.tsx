import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Share2, BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LoginForm from "./LoginForm";

interface VideoInteractionsProps {
  videoId: number;
  initialLikes: number;
  initialDislikes: number;
  initialUserLiked?: boolean;
  initialUserDisliked?: boolean;
}

export function VideoInteractions({
  videoId,
  initialLikes = 0,
  initialDislikes = 0,
  initialUserLiked = false,
  initialUserDisliked = false,
}: VideoInteractionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userLiked, setUserLiked] = useState(initialUserLiked);
  const [userDisliked, setUserDisliked] = useState(initialUserDisliked);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Like video mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to like video");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLikes(data.likes);
      setDislikes(data.dislikes);
      setUserLiked(data.userLiked);
      setUserDisliked(data.userDisliked);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId] });
      
      toast({
        title: userLiked ? "Like removed" : "Video liked",
        description: userLiked ? "You have removed your like" : "You have liked this video",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to like video",
        variant: "destructive",
      });
    },
  });

  // Dislike video mutation
  const dislikeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/videos/${videoId}/dislike`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to dislike video");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLikes(data.likes);
      setDislikes(data.dislikes);
      setUserLiked(data.userLiked);
      setUserDisliked(data.userDisliked);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId] });
      
      toast({
        title: userDisliked ? "Dislike removed" : "Video disliked",
        description: userDisliked ? "You have removed your dislike" : "You have disliked this video",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to dislike video",
        variant: "destructive",
      });
    },
  });

  // Handle like button click
  const handleLike = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    
    likeMutation.mutate();
  };

  // Handle dislike button click
  const handleDislike = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    
    dislikeMutation.mutate();
  };

  // Handle share button click
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      })
      .then(() => {
        toast({
          title: "Shared",
          description: "Video shared successfully",
        });
      })
      .catch((error) => {
        console.error("Error sharing:", error);
      });
    } else {
      // Fallback - copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Video link copied to clipboard",
      });
    }
  };

  // Format numbers for display
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    } else {
      return count.toString();
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={userLiked ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={handleLike}
                  disabled={likeMutation.isPending || dislikeMutation.isPending}
                >
                  <ThumbsUp className={`h-4 w-4 ${userLiked ? "fill-current" : ""}`} />
                  <span>{formatCount(likes)}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{userLiked ? "Unlike" : "Like"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={userDisliked ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={handleDislike}
                  disabled={likeMutation.isPending || dislikeMutation.isPending}
                >
                  <ThumbsDown className={`h-4 w-4 ${userDisliked ? "fill-current" : ""}`} />
                  <span>{formatCount(dislikes)}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{userDisliked ? "Remove dislike" : "Dislike"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator orientation="vertical" className="h-8" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share this video</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => {
                  if (!user) {
                    setLoginModalOpen(true);
                    return;
                  }
                  
                  toast({
                    title: "Saved",
                    description: "Video saved to your bookmarks",
                  });
                }}
              >
                <BookmarkIcon className="h-4 w-4" />
                <span>Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save to bookmarks</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <LoginForm open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </>
  );
}