import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import { useLocation } from "wouter";

export default function Liked() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Fetch liked videos
  const { data: likedVideos, isLoading } = useQuery({
    queryKey: user ? ['/api/users', user.id, 'liked'] : null,
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/liked`);
      if (!res.ok) throw new Error('Failed to fetch liked videos');
      return res.json();
    },
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto border border-border rounded-lg p-8 text-center">
          <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Liked Videos</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to view your liked videos</p>
          <Button onClick={() => navigate("/")}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Your Liked Videos</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-[180px] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : likedVideos && likedVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {likedVideos.map((likedItem: any) => (
            <VideoCard key={likedItem.id} video={likedItem.video} />
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No liked videos</h2>
          <p className="text-muted-foreground mb-4">You haven't liked any videos yet</p>
          <Button onClick={() => navigate("/")}>Browse Videos</Button>
        </div>
      )}
    </div>
  );
}