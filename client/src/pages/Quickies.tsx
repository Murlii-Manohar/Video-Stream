import React from "react";
import { useQuery } from "@tanstack/react-query";
import { QuickieCardGrid } from "@/components/QuickieCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Quickies() {
  // Fetch all quickies
  const { data: quickies, isLoading } = useQuery({
    queryKey: ["/api/videos/quickies"],
  });

  // Loading skeleton
  const QuickieSkeleton = () => (
    <div className="flex flex-col">
      <div className="relative rounded-lg overflow-hidden aspect-[9/16] mb-2">
        <Skeleton className="w-full h-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-poppins font-bold mb-6">Quickies</h1>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array(12).fill(0).map((_, index) => (
            <QuickieSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {quickies?.map((quickie: any) => (
            <QuickieCardGrid
              key={quickie.id}
              id={quickie.id}
              title={quickie.title}
              thumbnailPath={quickie.thumbnailPath}
              views={quickie.views}
              duration={quickie.duration}
            />
          ))}
        </div>
      )}
      
      {!isLoading && (!quickies || quickies.length === 0) && (
        <div className="text-center py-10">
          <p className="text-lg text-gray-500 dark:text-gray-400">
            No quickies found. Check back later for new content!
          </p>
        </div>
      )}
    </div>
  );
}
