import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";

interface CommentSectionProps {
  videoId: number;
}

export function CommentSection({ videoId }: CommentSectionProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch comments for this video
  const { data: comments = [], isLoading } = useQuery({
    queryKey: [`/api/videos/${videoId}/comments`],
  });
  
  // Add a new comment
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
      setNewComment("");
      setIsCommenting(false);
    }
  });
  
  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };
  
  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Comments ({comments.length})</h3>
        <button className="flex items-center space-x-1 text-sm">
          <span>Sort by</span>
        </button>
      </div>
      
      {/* Add comment */}
      {user && (
        <div className="flex items-start mb-6">
          <Avatar className="w-10 h-10 mr-3">
            <AvatarImage 
              src={user.profileImage || ""} 
              alt={user.displayName || user.username}
            />
            <AvatarFallback className="bg-primary text-white">
              {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                if (!isCommenting && e.target.value) setIsCommenting(true);
              }}
              className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 focus:outline-none focus:border-primary resize-none"
            />
            {isCommenting && (
              <div className="flex justify-end mt-2 space-x-2">
                <Button
                  variant="ghost" 
                  onClick={() => {
                    setNewComment("");
                    setIsCommenting(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddComment}
                  disabled={addCommentMutation.isPending}
                >
                  Comment
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          <p>Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex">
              <Avatar className="w-10 h-10 mr-3 flex-shrink-0">
                <AvatarImage 
                  src={comment.user?.profileImage || ""} 
                  alt={comment.user?.displayName || comment.user?.username}
                />
                <AvatarFallback className="bg-primary text-white">
                  {comment.user?.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">{comment.user?.displayName || comment.user?.username}</span>
                  {comment.user?.id === comment.video?.userId && (
                    <span className="text-xs bg-primary text-white px-1 rounded mr-1">Creator</span>
                  )}
                  <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1">{comment.content}</p>
                <div className="flex items-center mt-2 space-x-4 text-sm">
                  <button className="flex items-center space-x-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{comment.likes}</span>
                  </button>
                  <button className="flex items-center space-x-1">
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
