import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusIcon, CameraIcon, PencilIcon, LayoutDashboardIcon, Settings, ChevronRightIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import ChannelForm from "@/components/ChannelForm";

export default function MyChannelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  
  // Fetch user's channels
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/channels/user'],
    enabled: !!user,
  });
  
  // Handle create new channel
  const handleCreateChannel = () => {
    setEditingChannel(null);
    setChannelFormOpen(true);
  };
  
  // Handle edit channel
  const handleEditChannel = (channel: any) => {
    setEditingChannel(channel);
    setChannelFormOpen(true);
  };
  
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Channels</h1>
          <p className="text-muted-foreground">Manage your content channels and uploads</p>
        </div>
        <Button onClick={handleCreateChannel}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Channel
        </Button>
      </div>
      
      {channelsLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : channels && channels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel: any) => (
            <ChannelCard 
              key={channel.id} 
              channel={channel}
              onEdit={() => handleEditChannel(channel)}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <PlusIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Create Your First Channel</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Channels let you organize your content and build a following. Create a channel to start uploading videos.
              </p>
              <Button onClick={handleCreateChannel}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Channel Creation Dialog */}
      <ChannelForm 
        open={channelFormOpen} 
        onOpenChange={setChannelFormOpen}
        existingChannel={editingChannel}
      />
    </div>
  );
}

interface ChannelCardProps {
  channel: any;
  onEdit: () => void;
}

function ChannelCard({ channel, onEdit }: ChannelCardProps) {
  const [, navigate] = useLocation();
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20 relative">
        {channel.bannerImage ? (
          <img 
            src={channel.bannerImage} 
            alt={`${channel.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <h3 className="text-white text-xl font-bold">{channel.name}</h3>
        </div>
        <div className="absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-white/10 hover:bg-white/20 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical w-5 h-5">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit Channel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/channel/dashboard/${channel.id}`)}>
                <LayoutDashboardIcon className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/channel/settings/${channel.id}`)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/channel/${channel.id}`);
                }}
              >
                <ChevronRightIcon className="mr-2 h-4 w-4" />
                View Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardHeader className="pb-0">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{channel.name}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {channel.description || "No description provided"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="flex justify-between text-sm">
          <div>Created:</div>
          <div className="text-muted-foreground">
            {formatDate(channel.createdAt)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full"
          onClick={() => navigate(`/upload?channelId=${channel.id}`)}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload Video
        </Button>
      </CardFooter>
    </Card>
  );
}