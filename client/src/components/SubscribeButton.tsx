import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SubscribeButtonProps {
  channelId: number;
  channelName: string;
  initialIsSubscribed?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
}

export function SubscribeButton({
  channelId,
  channelName,
  initialIsSubscribed = false,
  size = "default"
}: SubscribeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/channels/${channelId}/subscribe`);
      return response.json();
    },
    onSuccess: () => {
      setIsSubscribed(true);
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelId}`] });
      toast({
        title: "Subscribed",
        description: `You've subscribed to ${channelName}`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to subscribe",
        variant: "destructive"
      });
    }
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/channels/${channelId}/subscribe`);
      return response.json();
    },
    onSuccess: () => {
      setIsSubscribed(false);
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelId}`] });
      toast({
        title: "Unsubscribed",
        description: `You've unsubscribed from ${channelName}`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unsubscribe",
        variant: "destructive"
      });
    }
  });

  const handleSubscribeToggle = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to subscribe to channels",
        variant: "destructive"
      });
      return;
    }

    if (isSubscribed) {
      unsubscribeMutation.mutate();
    } else {
      subscribeMutation.mutate();
    }
  };

  return (
    <Button
      onClick={handleSubscribeToggle}
      variant={isSubscribed ? "outline" : "default"}
      size={size}
      className={isSubscribed ? "border-gray-500 hover:border-gray-500" : "bg-primary text-white"}
      disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
    >
      {isSubscribed ? "Subscribed" : "Subscribe"}
    </Button>
  );
}