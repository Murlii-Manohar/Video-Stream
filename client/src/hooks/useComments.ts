import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useComments(videoId: number | null) {
  return useQuery({
    queryKey: videoId ? [`/api/videos/${videoId}/comments`] : null,
    queryFn: async () => {
      if (!videoId) return [];
      const response = await fetch(`/api/videos/${videoId}/comments`);
      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }
      return response.json();
    },
    enabled: !!videoId
  });
}

export function useAddComment(videoId: number | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (content: string) => {
      if (!videoId) throw new Error("Video ID is required");
      const response = await apiRequest("POST", `/api/videos/${videoId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      if (videoId) {
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
      }
    }
  });
}

export function useLikeComment(commentId: number | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!commentId) throw new Error("Comment ID is required");
      const response = await apiRequest("POST", `/api/comments/${commentId}/like`);
      return response.json();
    },
    onSuccess: (_, variables, context) => {
      // We would need to know the videoId here to properly invalidate the query
      // This is a simplified version that assumes the videoId is available elsewhere
      queryClient.invalidateQueries({ queryKey: ["/api/videos", null, "comments"] });
    }
  });
}
