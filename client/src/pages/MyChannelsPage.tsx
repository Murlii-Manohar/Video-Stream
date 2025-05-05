import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  PencilIcon,
  BrushIcon,
  LayoutDashboardIcon,
  Loader2Icon
} from "lucide-react";
import { Channel } from "@shared/schema";
import ChannelForm from "@/components/ChannelForm";

export default function MyChannelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState<Channel | undefined>(undefined);

  const { 
    data: channels, 
    isLoading, 
    isError,
    error 
  } = useQuery<Channel[]>({
    queryKey: ["/api/channels/user"],
    enabled: !!user,
  });

  const handleCreateChannel = () => {
    setChannelToEdit(undefined);
    setShowChannelForm(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setChannelToEdit(channel);
    setShowChannelForm(true);
  };

  const handleViewDashboard = (channelId: number) => {
    setLocation(`/dashboard?channelId=${channelId}`);
  };

  const handleManageContent = (channelId: number) => {
    setLocation(`/my-channel/${channelId}`);
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (isError) {
    toast({
      title: "Error loading channels",
      description: error instanceof Error ? error.message : "Failed to load your channels",
      variant: "destructive",
    });
  }

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Channels</h1>
        <Button onClick={handleCreateChannel} className="rounded-full">
          <PlusIcon className="h-4 w-4 mr-2" />
          Create New Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : channels && channels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <Card key={channel.id} className="overflow-hidden h-full flex flex-col">
              <div 
                className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20 relative"
                style={channel.bannerImage ? { backgroundImage: `url(${channel.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              />
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{channel.name}</CardTitle>
                <CardDescription>
                  Created on {formatDate(channel.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {channel.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter className="border-t bg-muted/30 px-6 py-4">
                <div className="flex justify-between w-full space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditChannel(channel)}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewDashboard(channel.id)}
                  >
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleManageContent(channel.id)}
                  >
                    <BrushIcon className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <PlusIcon className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Channels Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              You haven't created any channels yet. Start creating content by making your first channel.
            </p>
            <Button onClick={handleCreateChannel}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Channel
            </Button>
          </CardContent>
        </Card>
      )}

      <ChannelForm 
        open={showChannelForm} 
        onOpenChange={setShowChannelForm} 
        channelToEdit={channelToEdit} 
      />
    </div>
  );
}