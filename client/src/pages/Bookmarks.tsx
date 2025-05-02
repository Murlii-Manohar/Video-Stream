import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark } from "lucide-react";
import { useLocation } from "wouter";

export default function Bookmarks() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Fetch bookmarks (this would typically come from the server)
  const { data: bookmarks, isLoading } = useQuery({
    queryKey: user ? ['/api/users', user.id, 'bookmarks'] : null,
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/bookmarks`);
      if (!res.ok) throw new Error('Failed to fetch bookmarks');
      return res.json();
    },
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto border border-border rounded-lg p-8 text-center">
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Bookmarked Videos</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to view your bookmarks</p>
          <Button onClick={() => navigate("/")}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Your Bookmarks</h1>

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
      ) : bookmarks && bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {bookmarks.map((bookmark: any) => (
            <VideoCard key={bookmark.id} video={bookmark.video} />
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No bookmarked videos</h2>
          <p className="text-muted-foreground mb-4">You haven't bookmarked any videos yet</p>
          <Button onClick={() => navigate("/")}>Browse Videos</Button>
        </div>
      )}
    </div>
  );
}