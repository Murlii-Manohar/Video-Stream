import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "lucide-react";

// Adult content categories
const ADULT_CATEGORIES = [
  "Teen", 
  "MILF", 
  "Stepmom", 
  "Ebony", 
  "Black", 
  "Asian", 
  "Indian", 
  "Amateur", 
  "Professional", 
  "Verified Models", 
  "Anal", 
  "Threesome", 
  "Lesbian",
  "Cheating",
  "Couples",
  "Solo"
];

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.categorySlug as string;
  
  // Convert slug back to display name
  const getCategoryName = (slug: string) => {
    // First try to match directly with the known categories
    const category = ADULT_CATEGORIES.find(cat => 
      cat.toLowerCase().replace(/\s+/g, '-') === slug
    );
    
    if (category) return category;
    
    // If not found, create a presentable name from the slug
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const categoryName = getCategoryName(categorySlug);
  
  // Fetch videos
  const { data: videos, isLoading } = useQuery({
    queryKey: ['/api/videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    }
  });
  
  // Filter videos that match the category
  const categoryVideos = videos?.filter((video: any) => {
    if (!video.categories) return false;
    return video.categories.some((cat: string) => 
      cat.toLowerCase().replace(/\s+/g, '-') === categorySlug
    );
  });

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Tag className="h-8 w-8 mr-3" />
        <h1 className="text-3xl font-bold">{categoryName} Videos</h1>
      </div>
      
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
      ) : categoryVideos && categoryVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categoryVideos.map((video: any) => (
            <VideoCard 
              key={video.id}
              id={video.id}
              title={video.title}
              thumbnailPath={video.thumbnailPath || '/placeholder-thumbnail.jpg'}
              views={video.views || 0}
              duration={video.duration || 0}
              createdAt={video.createdAt}
              creator={{
                id: video.userId,
                username: video.creator?.username || 'Unknown',
                displayName: video.creator?.displayName,
                profileImage: video.creator?.profileImage
              }}
              categories={video.categories || []}
            />
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No videos in this category</h2>
          <p className="text-muted-foreground">
            We couldn't find any {categoryName} videos. Check back later!
          </p>
        </div>
      )}
    </div>
  );
}