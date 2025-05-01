import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { VideoCard } from "@/components/VideoCard";
import { QuickieCard } from "@/components/QuickieCard";
import CategoryFilter from "@/components/CategoryFilter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch featured/recent videos
  const { data: recentVideos, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["/api/videos/recent"],
  });

  // Fetch trending videos
  const { data: trendingVideos, isLoading: isLoadingTrending } = useQuery({
    queryKey: ["/api/videos/trending"],
  });

  // Fetch quickies
  const { data: quickies, isLoading: isLoadingQuickies } = useQuery({
    queryKey: ["/api/videos/quickies"],
  });
  
  // Extract all unique categories from videos
  const allCategories = useMemo(() => {
    const categorySet = new Set<string>();
    
    // Add categories from recent videos
    recentVideos?.forEach((video: any) => {
      if (video.categories && Array.isArray(video.categories)) {
        video.categories.forEach((category: string) => categorySet.add(category));
      }
    });
    
    // Add categories from trending videos
    trendingVideos?.forEach((video: any) => {
      if (video.categories && Array.isArray(video.categories)) {
        video.categories.forEach((category: string) => categorySet.add(category));
      }
    });
    
    return Array.from(categorySet).sort();
  }, [recentVideos, trendingVideos]);
  
  // Filter videos by selected category
  const filteredRecentVideos = useMemo(() => {
    if (!selectedCategory) return recentVideos;
    return recentVideos?.filter((video: any) => 
      video.categories && video.categories.includes(selectedCategory)
    );
  }, [recentVideos, selectedCategory]);
  
  const filteredTrendingVideos = useMemo(() => {
    if (!selectedCategory) return trendingVideos;
    return trendingVideos?.filter((video: any) => 
      video.categories && video.categories.includes(selectedCategory)
    );
  }, [trendingVideos, selectedCategory]);

  // Loading skeleton for video cards
  const VideoSkeleton = () => (
    <div className="rounded-lg overflow-hidden shadow-md bg-white dark:bg-dark-surface">
      <div className="aspect-video">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-3">
        <div className="flex">
          <Skeleton className="w-10 h-10 rounded-full mr-3" />
          <div className="w-full">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-1/2 mb-2" />
            <Skeleton className="h-2 w-1/3" />
          </div>
        </div>
      </div>
    </div>
  );

  // Loading skeleton for quickie cards
  const QuickieSkeleton = () => (
    <div className="flex-shrink-0 w-40 md:w-60">
      <div className="relative rounded-lg overflow-hidden aspect-[9/16] mb-2">
        <Skeleton className="w-full h-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      {/* Category Filter */}
      {!isLoadingRecent && !isLoadingTrending && allCategories.length > 0 && (
        <CategoryFilter
          categories={allCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}
      
      {/* Featured/Recent Videos Section */}
      <section className="mb-10 mt-6">
        <h2 className="text-2xl font-poppins font-bold mb-6">
          {selectedCategory ? `${selectedCategory} Videos` : "Featured Videos"}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingRecent
            ? Array(8).fill(0).map((_, index) => <VideoSkeleton key={index} />)
            : filteredRecentVideos?.map((video: any) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  thumbnailPath={video.thumbnailPath}
                  views={video.views}
                  duration={video.duration}
                  createdAt={video.createdAt}
                  creator={video.creator}
                  categories={video.categories}
                />
              ))}
        </div>
      </section>

      {/* Quickies Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-poppins font-bold">Quickies</h2>
          <Link href="/quickies" className="text-primary hover:underline font-medium">
            See all
          </Link>
        </div>
        
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
          {isLoadingQuickies
            ? Array(6).fill(0).map((_, index) => <QuickieSkeleton key={index} />)
            : quickies?.slice(0, 6).map((quickie: any) => (
                <QuickieCard
                  key={quickie.id}
                  id={quickie.id}
                  title={quickie.title}
                  thumbnailPath={quickie.thumbnailPath}
                  views={quickie.views}
                  duration={quickie.duration}
                />
              ))}
        </div>
      </section>

      {/* Trending Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-poppins font-bold mb-6">
          {selectedCategory ? `Trending ${selectedCategory} Videos` : "Trending Now"}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingTrending
            ? Array(8).fill(0).map((_, index) => <VideoSkeleton key={index} />)
            : filteredTrendingVideos?.map((video: any) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  thumbnailPath={video.thumbnailPath}
                  views={video.views}
                  duration={video.duration}
                  createdAt={video.createdAt}
                  creator={video.creator}
                  categories={video.categories}
                />
              ))}
        </div>
      </section>
    </div>
  );
}
