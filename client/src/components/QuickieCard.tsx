import React from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface QuickieProps {
  id: number;
  title: string;
  thumbnailPath: string;
  views: number;
  duration: number;
}

export function QuickieCard({ id, title, thumbnailPath, views, duration }: QuickieProps) {
  // Format the duration as mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Format the view count with K/M suffix
  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="flex-shrink-0 w-40 md:w-60">
      <Link href={`/watch/${id}?quickie=true`}>
        <a>
          <div className="relative rounded-lg overflow-hidden aspect-[9/16] mb-2">
            <img 
              src={thumbnailPath} 
              alt={title} 
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-1 rounded text-sm">
              {formatDuration(duration)}
            </span>
          </div>
          <h4 className="font-medium line-clamp-2 text-sm">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatViews(views)} views</p>
        </a>
      </Link>
    </div>
  );
}

export function QuickieCardGrid({ id, title, thumbnailPath, views, duration }: QuickieProps) {
  // Format the duration as mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Format the view count with K/M suffix
  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col">
      <Link href={`/watch/${id}?quickie=true`}>
        <a>
          <div className="relative rounded-lg overflow-hidden aspect-[9/16] mb-2">
            <img 
              src={thumbnailPath} 
              alt={title} 
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-1 rounded text-sm">
              {formatDuration(duration)}
            </span>
          </div>
          <h4 className="font-medium line-clamp-2 text-sm">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatViews(views)} views</p>
        </a>
      </Link>
    </div>
  );
}
