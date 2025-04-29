import { useQuery } from "@tanstack/react-query";

// Hook to get recent videos
export function useRecentVideos(limit = 8) {
  return useQuery({
    queryKey: ["/api/videos/recent", limit],
    queryFn: async () => {
      const response = await fetch(`/api/videos/recent?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch recent videos");
      }
      return response.json();
    }
  });
}

// Hook to get trending videos
export function useTrendingVideos(limit = 8) {
  return useQuery({
    queryKey: ["/api/videos/trending", limit],
    queryFn: async () => {
      const response = await fetch(`/api/videos/trending?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch trending videos");
      }
      return response.json();
    }
  });
}

// Hook to get quickies
export function useQuickies(limit = 12) {
  return useQuery({
    queryKey: ["/api/videos/quickies", limit],
    queryFn: async () => {
      const response = await fetch(`/api/videos/quickies?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch quickies");
      }
      return response.json();
    }
  });
}

// Hook to get a single video
export function useVideo(id: number | null) {
  return useQuery({
    queryKey: id ? [`/api/videos/${id}`] : null,
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/videos/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch video");
      }
      return response.json();
    },
    enabled: !!id
  });
}

// Hook to get videos by user
export function useUserVideos(userId: number | null) {
  return useQuery({
    queryKey: userId ? ["/api/videos", { userId }] : null,
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/${userId}/videos`);
      if (!response.ok) {
        throw new Error("Failed to fetch user videos");
      }
      return response.json();
    },
    enabled: !!userId
  });
}

// Hook to get liked videos
export function useLikedVideos(userId: number | null) {
  return useQuery({
    queryKey: userId ? ["/api/users", userId, "liked-videos"] : null,
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/${userId}/liked-videos`);
      if (!response.ok) {
        throw new Error("Failed to fetch liked videos");
      }
      return response.json();
    },
    enabled: !!userId
  });
}

// Hook to get video history
export function useVideoHistory(userId: number | null) {
  return useQuery({
    queryKey: userId ? ["/api/users", userId, "history"] : null,
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/${userId}/history`);
      if (!response.ok) {
        throw new Error("Failed to fetch video history");
      }
      return response.json();
    },
    enabled: !!userId
  });
}
