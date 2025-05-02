import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Fetch watch history
  const { data: history, isLoading } = useQuery({
    queryKey: user ? ['/api/users', user.id, 'history'] : null,
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: !!user
  });

  // Function to clear history (this would need to be implemented on the backend)
  const clearHistory = async () => {
    try {
      await apiRequest('DELETE', `/api/users/${user?.id}/history`);
      toast({
        title: "History cleared",
        description: "Your watch history has been cleared successfully",
      });
      // Refetch history data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again later.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto border border-border rounded-lg p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Watch History</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to view your watch history</p>
          <Button onClick={() => navigate("/")}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-2 md:mb-0">Watch History</h1>
        {history && history.length > 0 && (
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={clearHistory}
          >
            <Trash2 className="h-4 w-4" />
            Clear History
          </Button>
        )}
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
      ) : history && history.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {history.map((historyItem: any) => (
            <VideoCard key={historyItem.id} video={historyItem.video} />
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No watch history</h2>
          <p className="text-muted-foreground mb-4">You haven't watched any videos yet</p>
          <Button onClick={() => navigate("/")}>Browse Videos</Button>
        </div>
      )}
    </div>
  );
}