import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  MoreVertical, 
  Flag, 
  Trash2,
  Reply
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LoginForm from "./LoginForm";

interface CommentSectionProps {
  videoId: number;
}

export function CommentSection({ videoId }: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  
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
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}`] });
      setNewComment("");
      setIsCommenting(false);
      setReplyText("");
      setReplyingTo(null);
    }
  });
  
  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest("DELETE", `/api/comments/${commentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}`] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete comment"
      });
    }
  });
  
  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest("POST", `/api/comments/${commentId}/like`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
    }
  });
  
  const handleAddComment = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };
  
  const handleReply = (commentId: number) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    
    if (replyText.trim()) {
      // In a real app, you'd pass the parent comment ID
      addCommentMutation.mutate(replyText);
    }
  };
  
  const handleLikeComment = (commentId: number) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    
    likeCommentMutation.mutate(commentId);
  };
  
  const handleDeleteComment = (commentId: number) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };
  
  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Check if user can delete a comment
  const canDeleteComment = (comment: any) => {
    if (!user) return false;
    return user.id === comment.userId || user.isAdmin;
  };
  
  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-xl">Comments ({comments.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Top Comments
          </Button>
        </div>
      </div>
      
      {/* Add comment */}
      {user ? (
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
              className="w-full resize-none min-h-[80px]"
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
                  disabled={addCommentMutation.isPending || !newComment.trim()}
                >
                  {addCommentMutation.isPending ? "Posting..." : "Comment"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-muted p-4 rounded-md mb-6">
          <p className="text-center mb-2">You need to be logged in to comment</p>
          <div className="flex justify-center">
            <Button onClick={() => setLoginModalOpen(true)}>Sign In to Comment</Button>
          </div>
        </div>
      )}
      
      {/* Comments list */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="space-y-3">
              <div className="flex">
                <Avatar className="w-10 h-10 mr-3 flex-shrink-0">
                  <AvatarImage 
                    src={comment.user?.profileImage || ""} 
                    alt={comment.user?.displayName || comment.user?.username}
                  />
                  <AvatarFallback className="bg-primary text-white">
                    {comment.user?.username?.substring(0, 2).toUpperCase() || "UN"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">{comment.user?.displayName || comment.user?.username}</span>
                    {comment.user?.id === comment.video?.userId && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded mr-2">Creator</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="mt-1">{comment.content}</p>
                  <div className="flex items-center mt-2 gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-1 h-8 px-2"
                      onClick={() => handleLikeComment(comment.id)}
                    >
                      <ThumbsUp className={`h-4 w-4 ${comment.userLiked ? 'fill-primary' : ''}`} />
                      <span className="text-xs">{comment.likes || 0}</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      <span className="text-xs">Reply</span>
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            if (!user) {
                              setLoginModalOpen(true);
                              return;
                            }
                            toast({
                              title: "Comment reported",
                              description: "Thank you for helping keep our community safe"
                            });
                          }}
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          <span>Report</span>
                        </DropdownMenuItem>
                        
                        {canDeleteComment(comment) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-500"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              {replyingTo === comment.id && (
                <div className="pl-12">
                  <div className="flex items-start">
                    {user && (
                      <Avatar className="w-8 h-8 mr-3 flex-shrink-0">
                        <AvatarImage src={user.profileImage || ""} />
                        <AvatarFallback className="bg-primary text-white">
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <Textarea
                        placeholder={`Reply to ${comment.user?.displayName || comment.user?.username}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full resize-none min-h-[60px]"
                      />
                      <div className="flex justify-end mt-2 space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyText("");
                            setReplyingTo(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!replyText.trim() || addCommentMutation.isPending}
                          onClick={() => handleReply(comment.id)}
                        >
                          {addCommentMutation.isPending ? "Replying..." : "Reply"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <LoginForm open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
}
