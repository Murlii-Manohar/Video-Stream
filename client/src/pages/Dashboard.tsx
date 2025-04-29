import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "wouter";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Eye, 
  UserPlus, 
  Clock, 
  DollarSign,
  ArrowUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  
  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });
  
  // Fetch user's videos
  const { data: userVideos, isLoading: isLoadingVideos } = useQuery({
    queryKey: user ? [`/api/videos/${user.id}`] : null,
    enabled: !!user,
  });
  
  if (!user) {
    return null; // Will redirect in useEffect
  }
  
  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };
  
  // Format the date as "X time ago"
  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-poppins font-bold mb-6">Creator Dashboard</h1>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Views</h3>
              <Eye className="text-primary h-6 w-6" />
            </div>
            <p className="text-3xl font-bold">{isLoadingStats ? "..." : formatNumber(stats?.totalViews || 0)}</p>
            <p className="text-sm text-green-500 mt-2">
              <ArrowUp className="inline h-4 w-4 mr-1" /> 12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Subscribers</h3>
              <UserPlus className="text-secondary h-6 w-6" />
            </div>
            <p className="text-3xl font-bold">
              {isLoadingStats ? "..." : formatNumber(stats?.subscriberCount || 0)}
            </p>
            <p className="text-sm text-green-500 mt-2">
              <ArrowUp className="inline h-4 w-4 mr-1" /> 8% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Watch Time</h3>
              <Clock className="text-purple-500 h-6 w-6" />
            </div>
            <p className="text-3xl font-bold">
              {isLoadingStats ? "..." : formatNumber(Math.floor((stats?.totalViews || 0) * 0.12)) + " hrs"}
            </p>
            <p className="text-sm text-green-500 mt-2">
              <ArrowUp className="inline h-4 w-4 mr-1" /> 15% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Revenue</h3>
              <DollarSign className="text-green-500 h-6 w-6" />
            </div>
            <p className="text-3xl font-bold">
              ${isLoadingStats ? "..." : ((stats?.totalViews || 0) * 0.00492).toFixed(2)}
            </p>
            <p className="text-sm text-green-500 mt-2">
              <ArrowUp className="inline h-4 w-4 mr-1" /> 18% from last month
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent videos performance */}
      <Card className="mb-8">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-xl">Recent Videos Performance</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800">
              <TableRow>
                <TableHead>Video</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Likes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingVideos ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Loading videos...</TableCell>
                </TableRow>
              ) : userVideos && userVideos.length > 0 ? (
                userVideos.slice(0, 5).map((video: any) => (
                  <TableRow key={video.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-20 h-12 rounded overflow-hidden mr-3 flex-shrink-0">
                          <img 
                            src={video.thumbnailPath} 
                            alt={video.title} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <span className="line-clamp-1">{video.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(video.createdAt)}</TableCell>
                    <TableCell>{formatNumber(video.views)}</TableCell>
                    <TableCell>{formatNumber(video.comments?.length || 0)}</TableCell>
                    <TableCell>{formatNumber(video.likes)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    No videos found. <Link href="/upload"><a className="text-primary hover:underline">Upload your first video</a></Link>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Audience insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-xl">Audience Demographics</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Age distribution chart */}
            <div className="h-72 flex items-end space-x-4">
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-primary bg-opacity-70 rounded-t" style={{ height: "40%" }}></div>
                <span className="mt-2 text-sm">18-24</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-primary bg-opacity-70 rounded-t" style={{ height: "85%" }}></div>
                <span className="mt-2 text-sm">25-34</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-primary bg-opacity-70 rounded-t" style={{ height: "65%" }}></div>
                <span className="mt-2 text-sm">35-44</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-primary bg-opacity-70 rounded-t" style={{ height: "35%" }}></div>
                <span className="mt-2 text-sm">45-54</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-primary bg-opacity-70 rounded-t" style={{ height: "20%" }}></div>
                <span className="mt-2 text-sm">55+</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-xl">Top Countries</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              <li className="flex justify-between items-center">
                <span>United States</span>
                <span className="text-sm font-medium">42%</span>
              </li>
              <li className="flex justify-between items-center">
                <span>United Kingdom</span>
                <span className="text-sm font-medium">18%</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Canada</span>
                <span className="text-sm font-medium">12%</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Germany</span>
                <span className="text-sm font-medium">8%</span>
              </li>
              <li className="flex justify-between items-center">
                <span>France</span>
                <span className="text-sm font-medium">6%</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Other</span>
                <span className="text-sm font-medium">14%</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
