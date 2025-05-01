import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { 
  UserIcon, 
  VideoIcon, 
  TrashIcon, 
  EyeIcon, 
  PenIcon,
  BanIcon,
  MoreVertical,
  ShieldIcon,
  UserCheckIcon,
  Flag
} from "lucide-react";

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [contentToDelete, setContentToDelete] = useState<any>(null);
  const [isContentDeleteOpen, setIsContentDeleteOpen] = useState(false);
  const [userToAction, setUserToAction] = useState<any>(null);
  const [isUserActionOpen, setIsUserActionOpen] = useState(false);
  const [userAction, setUserAction] = useState<"ban" | "unban" | "promote" | "demote" | null>(null);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user?.isAdmin,
  });

  // Fetch all videos
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['/api/admin/videos'],
    enabled: !!user?.isAdmin,
  });

  // Fetch all reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/admin/reports'],
    enabled: !!user?.isAdmin,
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/videos/${videoId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videos'] });
      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
      setIsContentDeleteOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    },
  });

  // Delete channel mutation
  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/channels/${channelId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channels'] });
      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
      setIsContentDeleteOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    },
  });

  // Ban user mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number, action: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/${action}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
      setIsUserActionOpen(false);
      setUserAction(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Handle delete content
  const handleDeleteContent = () => {
    if (!contentToDelete) return;
    
    if (contentToDelete.type === 'video') {
      deleteVideoMutation.mutate(contentToDelete.id);
    } else if (contentToDelete.type === 'channel') {
      deleteChannelMutation.mutate(contentToDelete.id);
    }
  };

  // Handle user action
  const handleUserAction = () => {
    if (!userToAction || !userAction) return;
    
    updateUserStatusMutation.mutate({ userId: userToAction.id, action: userAction });
  };

  // Filter users based on search term
  const filteredUsers = users.filter((user: any) => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter videos based on search term
  const filteredVideos = videos.filter((video: any) => 
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, navigate]);

  if (!user || !user.isAdmin) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center h-[calc(100vh-16rem)]">
        <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-6 rounded-lg text-center">
          <ShieldIcon className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6">You don't have permission to access the admin panel</p>
          <Button onClick={() => navigate("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <ShieldIcon className="mr-2 h-6 w-6" /> Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage users, content, and site settings
          </p>
        </div>
        <div className="w-full md:w-64">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <UserIcon className="h-4 w-4 mr-2" /> Users
          </TabsTrigger>
          <TabsTrigger value="videos">
            <VideoIcon className="h-4 w-4 mr-2" /> Videos
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Flag className="h-4 w-4 mr-2" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No users found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>List of all users on the platform</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.isBanned ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300" 
                          : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        }`}>
                          {user.isBanned ? "Banned" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.isAdmin ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" 
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                        }`}>
                          {user.isAdmin ? "Admin" : "User"}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUser(user);
                                // Logic to view user details
                              }}
                            >
                              <EyeIcon className="mr-2 h-4 w-4" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {!user.isBanned ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToAction(user);
                                  setUserAction("ban");
                                  setIsUserActionOpen(true);
                                }}
                                className="text-red-500"
                              >
                                <BanIcon className="mr-2 h-4 w-4" />
                                <span>Ban User</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToAction(user);
                                  setUserAction("unban");
                                  setIsUserActionOpen(true);
                                }}
                                className="text-green-500"
                              >
                                <UserCheckIcon className="mr-2 h-4 w-4" />
                                <span>Unban User</span>
                              </DropdownMenuItem>
                            )}
                            
                            {!user.isAdmin ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToAction(user);
                                  setUserAction("promote");
                                  setIsUserActionOpen(true);
                                }}
                              >
                                <ShieldIcon className="mr-2 h-4 w-4" />
                                <span>Make Admin</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToAction(user);
                                  setUserAction("demote");
                                  setIsUserActionOpen(true);
                                }}
                              >
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Remove Admin</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-4">
          {videosLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No videos found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>List of all videos on the platform</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Uploader</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map((video: any) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div className="h-12 w-20 bg-muted rounded-md overflow-hidden">
                          <img 
                            src={video.thumbnailPath ? `/uploads/${video.thumbnailPath}` : '/placeholder-thumbnail.jpg'} 
                            alt={video.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[200px]">
                        {video.title}
                      </TableCell>
                      <TableCell>{video.username || 'Unknown'}</TableCell>
                      <TableCell>{video.views}</TableCell>
                      <TableCell>{formatDate(video.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/watch/${video.id}`)}
                            >
                              <EyeIcon className="mr-2 h-4 w-4" />
                              <span>View Video</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              onClick={() => {
                                setContentToDelete({ id: video.id, type: 'video', title: video.title });
                                setIsContentDeleteOpen(true);
                              }}
                              className="text-red-500"
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              <span>Delete Video</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reportsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No reports found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((report: any) => (
                <Card key={report.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle className="text-md">
                          {report.contentType === 'video' ? 'Video Report' : 
                           report.contentType === 'comment' ? 'Comment Report' : 
                           'User Report'}
                        </CardTitle>
                        <CardDescription>
                          Reported {formatDate(report.createdAt)}
                        </CardDescription>
                      </div>
                      <span className={`px-2 py-1 h-fit rounded-full text-xs ${
                        report.status === 'pending' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300" :
                        report.status === 'resolved' ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300" :
                        "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                      }`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Reason:</span>
                        <p className="text-sm">{report.reason}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Reported by:</span>
                        <p className="text-sm">{report.reporterUsername}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Content:</span>
                        <p className="text-sm truncate">{report.contentTitle || report.contentText || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // View reported content
                        if (report.contentType === 'video' && report.contentId) {
                          navigate(`/watch/${report.contentId}`);
                        }
                      }}
                    >
                      <EyeIcon className="mr-2 h-4 w-4" />
                      View Content
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        // Mark as resolved
                        toast({
                          title: "Report Resolved",
                          description: "The report has been marked as resolved"
                        });
                      }}
                    >
                      Resolve
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Alert Dialogs */}
      <AlertDialog open={isContentDeleteOpen} onOpenChange={setIsContentDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contentToDelete?.title}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContent}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isUserActionOpen} onOpenChange={setIsUserActionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userAction === "ban" ? "Ban User" : 
               userAction === "unban" ? "Unban User" : 
               userAction === "promote" ? "Promote to Admin" : 
               "Remove Admin Status"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userAction === "ban" ? 
                `Are you sure you want to ban ${userToAction?.username}? They will no longer be able to log in or use platform features.` : 
               userAction === "unban" ? 
                `Are you sure you want to unban ${userToAction?.username}? They will regain access to the platform.` : 
               userAction === "promote" ? 
                `Are you sure you want to make ${userToAction?.username} an admin? They will have full access to the admin panel.` : 
                `Are you sure you want to remove admin status from ${userToAction?.username}? They will no longer have access to the admin panel.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUserAction}
              className={userAction === "ban" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}