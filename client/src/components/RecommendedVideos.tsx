import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { VideoCard } from './VideoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface RecommendedVideosProps {
  type: 'personalized' | 'similar' | 'category';
  videoId?: number;
  category?: string;
  limit?: number;
}

const RecommendedVideos: React.FC<RecommendedVideosProps> = ({ 
  type = 'personalized', 
  videoId, 
  category,
  limit = 8
}) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  // Determine the API endpoint based on the type
  let queryKey = '';
  
  if (type === 'personalized') {
    queryKey = '/api/recommendations';
  } else if (type === 'similar' && videoId) {
    queryKey = `/api/videos/${videoId}/similar`;
  } else if (type === 'category' && category) {
    queryKey = `/api/recommendations/category/${category}`;
  }
  
  const { data: videos, isLoading, error } = useQuery({
    queryKey: [queryKey, limit],
    queryFn: async () => {
      if (!queryKey) return [];
      
      // For personalized recommendations, we need authentication
      if (type === 'personalized' && !isAuthenticated) {
        return [];
      }
      
      const response = await fetch(`${queryKey}?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      
      return response.json();
    },
    enabled: !!queryKey && (type !== 'personalized' || isAuthenticated),
    refetchOnWindowFocus: false
  });
  
  // Generate a title based on the type
  let title = '';
  if (type === 'personalized') {
    title = 'Recommended For You';
  } else if (type === 'similar') {
    title = 'Similar Videos';
  } else if (type === 'category') {
    title = `${category} Videos`;
  }

  // If loading, show skeletons
  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(limit).fill(0).map((_, index) => (
            <div key={index} className="flex flex-col space-y-2">
              <Skeleton className="w-full h-40 rounded-md" />
              <Skeleton className="w-3/4 h-4 rounded-md" />
              <Skeleton className="w-1/2 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If there's an error, show error message
  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading recommendations. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If no videos, don't show the section
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video: any) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
};

export default RecommendedVideos;