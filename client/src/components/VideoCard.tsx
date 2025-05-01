import React from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PlayIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VideoCreator {
  id: number;
  username: string;
  displayName?: string;
  profileImage?: string;
}

interface VideoProps {
  id: number;
  title: string;
  thumbnailPath: string;
  views: number;
  duration: number;
  createdAt: string | Date;
  creator: VideoCreator;
}

export function VideoCard({ id, title, thumbnailPath, views, duration, createdAt, creator }: VideoProps) {
  // Format the duration as mm:ss or hh:mm:ss
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
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
  
  // Format the date as "X time ago"
  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Card className="video-card overflow-hidden shadow-md bg-white dark:bg-dark-surface hover:shadow-lg transition-shadow duration-300">
      <Link href={`/watch/${id}`} className="block relative aspect-video">
        <img 
          src={thumbnailPath} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        <span className="video-duration absolute bottom-2 right-2 bg-black bg-opacity-80 text-white px-1 rounded text-sm">
          {formatDuration(duration)}
        </span>
        <div className="video-actions absolute inset-0 bg-black bg-opacity-50 opacity-0 transition-opacity flex items-center justify-center">
          <button className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center">
            <PlayIcon className="h-6 w-6" />
          </button>
        </div>
      </Link>
      <CardContent className="p-3">
        <div className="flex">
          <Link href={`/channel/${creator.id}`} className="flex-shrink-0">
            <Avatar className="w-10 h-10 mr-3">
              <AvatarImage 
                src={creator.profileImage} 
                alt={creator.displayName || creator.username}
              />
              <AvatarFallback className="bg-primary text-white">
                {creator.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <h3 className="font-medium line-clamp-2 text-gray-900 dark:text-gray-100">
              <Link href={`/watch/${id}`} className="hover:underline">
                {title}
              </Link>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <Link href={`/channel/${creator.id}`} className="hover:underline">
                {creator.displayName || creator.username}
              </Link>
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {formatViews(views)} views • {formatDate(createdAt)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
