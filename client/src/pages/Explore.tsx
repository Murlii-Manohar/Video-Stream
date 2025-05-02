import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "@/components/VideoCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import CategoryFilter from "@/components/CategoryFilter";
import { Skeleton } from "@/components/ui/skeleton";

// Adult content categories from our shared constant
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

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch all videos
  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['/api/videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    }
  });

  // Filter videos based on search query and selected category
  const filteredVideos = videos?.filter((video: any) => {
    const matchesSearch = !searchQuery || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || 
      (video.categories && video.categories.includes(selectedCategory));
    
    return matchesSearch && matchesCategory;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The filtering is already reactive, so we don't need to do anything here
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Explore Content</h1>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>
      </form>
      
      {/* Category Filter */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Filter by Category</h2>
        <CategoryFilter 
          categories={ADULT_CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>
      
      {/* Video Grid */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          {selectedCategory ? `${selectedCategory} Videos` : "All Videos"}
          {searchQuery && ` matching "${searchQuery}"`}
        </h2>
        
        {isLoadingVideos ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-[180px] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredVideos && filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredVideos.map((video: any) => (
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
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-lg text-muted-foreground">
              {searchQuery || selectedCategory 
                ? "No videos match your search criteria" 
                : "No videos available"}
            </p>
            {(searchQuery || selectedCategory) && (
              <Button
                variant="link" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}