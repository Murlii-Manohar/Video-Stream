import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, PlusCircle, X, Check, Import } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface VideoEntry {
  userId: number;
  title: string;
  description?: string;
  filePath: string;
  thumbnailPath?: string;
  duration?: number;
  categories?: string[];
  tags?: string[];
  isQuickie?: boolean;
  isPublished?: boolean;
}

export function AdminMassUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<VideoEntry[]>([{
    userId: 0,
    title: '',
    filePath: '',
    isPublished: true
  }]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importSource, setImportSource] = useState('');
  const [importCount, setImportCount] = useState(5);
  const [isImporting, setIsImporting] = useState(false);
  const [importedVideos, setImportedVideos] = useState<any[]>([]);

  // Fetch all users for dropdown selection
  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Add video entry mutation
  const addVideoMutation = useMutation({
    mutationFn: async (video: VideoEntry) => {
      const response = await apiRequest("POST", "/api/admin/videos", video);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videos'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add video: " + (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Mass import videos mutation
  const importVideosMutation = useMutation({
    mutationFn: async (params: { source: string, count: number, userId: number }) => {
      const response = await apiRequest("POST", "/api/admin/videos/import", params);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videos'] });
      setImportedVideos(data.videos || []);
      setIsImporting(false);
      toast({
        title: "Success",
        description: `Imported ${data.videos?.length || 0} videos successfully`,
      });
    },
    onError: (error) => {
      setIsImporting(false);
      toast({
        title: "Error",
        description: "Failed to import videos: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Handle adding a new blank entry
  const addEntry = () => {
    setEntries([...entries, {
      userId: entries[0].userId, // Copy the first user ID for convenience
      title: '',
      filePath: '',
      isPublished: true
    }]);
    setActiveTabIndex(entries.length);
  };

  // Handle removing an entry
  const removeEntry = (index: number) => {
    const newEntries = [...entries];
    newEntries.splice(index, 1);
    setEntries(newEntries);
    if (activeTabIndex >= newEntries.length) {
      setActiveTabIndex(Math.max(0, newEntries.length - 1));
    }
  };

  // Handle updating an entry field
  const updateEntry = (index: number, field: keyof VideoEntry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  // Handle submitting the form
  const handleSubmit = async () => {
    // Validate entries
    const validEntries = entries.filter(entry => 
      entry.userId && entry.title && entry.filePath
    );
    
    if (validEntries.length === 0) {
      toast({
        title: "Validation Error",
        description: "All videos must have a user, title, and file path",
        variant: "destructive",
      });
      return;
    }

    // Process entries in sequence
    let successCount = 0;
    let failCount = 0;

    for (const entry of validEntries) {
      try {
        await addVideoMutation.mutateAsync(entry);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    // Show results
    if (successCount > 0) {
      toast({
        title: "Success",
        description: `Added ${successCount} videos successfully ${failCount > 0 ? `(${failCount} failed)` : ''}`,
      });
      // Reset form if all successful
      if (failCount === 0) {
        setEntries([{
          userId: entries[0].userId, // Keep the last used user
          title: '',
          filePath: '',
          isPublished: true
        }]);
        setActiveTabIndex(0);
        setIsOpen(false);
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to add any videos",
        variant: "destructive",
      });
    }
  };

  // Handle importing videos
  const handleImport = async () => {
    if (!importSource || !entries[0].userId) {
      toast({
        title: "Error",
        description: "Please select a user and enter a source URL",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      await importVideosMutation.mutateAsync({
        source: importSource,
        count: importCount,
        userId: entries[0].userId
      });
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Mass Upload Videos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mass Upload Videos</DialogTitle>
            <DialogDescription>
              Add multiple videos at once. Each video requires a user, title, and direct file path URL.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-2 overflow-x-auto pb-2 max-w-[calc(100%-120px)]">
                {entries.map((_, index) => (
                  <Button
                    key={index}
                    variant={activeTabIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTabIndex(index)}
                    className="min-w-[40px] relative"
                  >
                    {index + 1}
                    {entries.length > 1 && (
                      <button
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEntry(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addEntry}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-4">
              {/* User selection - shared across all entries for convenience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">User (Owner) *</Label>
                  <Select
                    value={entries[activeTabIndex].userId?.toString() || ''}
                    onValueChange={(value) => {
                      // Update all entries with the same userID for convenience
                      const userId = parseInt(value);
                      setEntries(entries.map(entry => ({...entry, userId})));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.username} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current active entry form */}
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-medium">Video #{activeTabIndex + 1} Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={entries[activeTabIndex].title}
                    onChange={(e) => updateEntry(activeTabIndex, 'title', e.target.value)}
                    placeholder="Video title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="filePath">File Path/URL *</Label>
                  <Input
                    id="filePath"
                    value={entries[activeTabIndex].filePath}
                    onChange={(e) => updateEntry(activeTabIndex, 'filePath', e.target.value)}
                    placeholder="Direct URL to video file"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="thumbnailPath">Thumbnail Path/URL</Label>
                  <Input
                    id="thumbnailPath"
                    value={entries[activeTabIndex].thumbnailPath || ''}
                    onChange={(e) => updateEntry(activeTabIndex, 'thumbnailPath', e.target.value)}
                    placeholder="Direct URL to thumbnail image (optional)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={entries[activeTabIndex].description || ''}
                    onChange={(e) => updateEntry(activeTabIndex, 'description', e.target.value)}
                    placeholder="Video description (optional)"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={entries[activeTabIndex].duration || ''}
                      onChange={(e) => updateEntry(
                        activeTabIndex, 
                        'duration', 
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )}
                      placeholder="Video duration in seconds"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={entries[activeTabIndex].tags?.join(', ') || ''}
                      onChange={(e) => updateEntry(
                        activeTabIndex, 
                        'tags', 
                        e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      )}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="isQuickie"
                    checked={entries[activeTabIndex].isQuickie || false}
                    onCheckedChange={(checked) => updateEntry(
                      activeTabIndex, 
                      'isQuickie', 
                      checked === true
                    )}
                  />
                  <Label htmlFor="isQuickie">This is a quickie (short video)</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPublished"
                      checked={entries[activeTabIndex].isPublished !== false}
                      onCheckedChange={(checked) => updateEntry(
                        activeTabIndex, 
                        'isPublished', 
                        checked === true
                      )}
                    />
                    <Label htmlFor="isPublished">Publish immediately</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Import className="h-4 w-4 mr-2" />
                Import from Site
              </Button>
              <div>
                <Button variant="outline" onClick={() => setIsOpen(false)} className="mr-2">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={addVideoMutation.isPending}
                >
                  {addVideoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload {entries.length > 1 ? `${entries.length} Videos` : 'Video'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Videos</DialogTitle>
            <DialogDescription>
              Import videos from external sites or content services
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="importSource">Source URL</Label>
              <Input
                id="importSource"
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                placeholder="URL of site to import from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="importCount">Number of Videos to Import</Label>
              <Input
                id="importCount"
                type="number"
                min="1"
                max="20"
                value={importCount}
                onChange={(e) => setImportCount(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="importUser">Assign to User</Label>
              <Select
                value={entries[0].userId?.toString() || ''}
                onValueChange={(value) => {
                  const userId = parseInt(value);
                  setEntries(entries.map(entry => ({...entry, userId})));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {importedVideos.length > 0 && (
              <div className="mt-4 border p-3 rounded-md">
                <h3 className="font-medium mb-2">Imported Videos</h3>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {importedVideos.map((video, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm truncate">{video.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="mr-2">
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={isImporting || !importSource}
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Import className="mr-2 h-4 w-4" />
              )}
              Import Videos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}