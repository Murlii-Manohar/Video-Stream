import React from "react";
import { Link } from "wouter";
import { VideoCard } from "@/components/VideoCard";
import { QuickieCard } from "@/components/QuickieCard";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
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
      {/* Featured/Recent Videos Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-poppins font-bold mb-6">Featured Videos</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingRecent
            ? Array(8).fill(0).map((_, index) => <VideoSkeleton key={index} />)
            : recentVideos?.map((video: any) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  thumbnailPath={video.thumbnailPath}
                  views={video.views}
                  duration={video.duration}
                  createdAt={video.createdAt}
                  creator={video.creator}
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
        <h2 className="text-2xl font-poppins font-bold mb-6">Trending Now</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingTrending
            ? Array(8).fill(0).map((_, index) => <VideoSkeleton key={index} />)
            : trendingVideos?.map((video: any) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  thumbnailPath={video.thumbnailPath}
                  views={video.views}
                  duration={video.duration}
                  createdAt={video.createdAt}
                  creator={video.creator}
                />
              ))}
        </div>
      </section>
    </div>
  );
}
