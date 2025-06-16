
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Image, Video, Smile, MapPin, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InstagramStylePostCreatorProps {
  onPostCreated?: () => void;
}

const InstagramStylePostCreator = ({ onPostCreated }: InstagramStylePostCreatorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPostMutation = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          image_url: imageUrl,
          post_type: 'text'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      setContent("");
      setSelectedFiles([]);
      setPreviewUrls([]);
      toast({
        title: "Posted!",
        description: "Your post has been shared with the community.",
      });
      onPostCreated?.();
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 files like Instagram
    const limitedFiles = files.slice(0, 10);
    setSelectedFiles(prev => [...prev, ...limitedFiles].slice(0, 10));

    // Create preview URLs
    limitedFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, url]);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;

    let imageUrl = undefined;
    if (selectedFiles.length > 0) {
      // For now, we'll just use the first file
      // In a real implementation, you'd upload to Supabase Storage
      imageUrl = previewUrls[0];
    }

    createPostMutation.mutate({ content, imageUrl });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Create post</h3>
        <Button
          onClick={handlePost}
          disabled={createPostMutation.isPending || (!content.trim() && selectedFiles.length === 0)}
          className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-1 rounded-lg disabled:opacity-50"
        >
          {createPostMutation.isPending ? 'Sharing...' : 'Share'}
        </Button>
      </div>

      {/* User Info */}
      <div className="flex items-center p-4 pb-2">
        <Avatar className="w-10 h-10 mr-3">
          <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" />
          <AvatarFallback>You</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">You</p>
          <select className="text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none outline-none">
            <option>🌍 Public</option>
            <option>👥 Friends</option>
            <option>🔒 Only me</option>
          </select>
        </div>
      </div>

      {/* Content Input */}
      <div className="px-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-0 text-lg placeholder-gray-500 dark:placeholder-gray-400 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white"
          rows={3}
          style={{ minHeight: '60px' }}
        />
      </div>

      {/* Media Preview */}
      {previewUrls.length > 0 && (
        <div className="px-4 py-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {selectedFiles[index]?.type.startsWith('video/') ? (
                    <video 
                      src={url} 
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                    />
                  ) : (
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors"
          >
            <Image className="w-5 h-5" />
            <span className="text-sm font-medium">Photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors"
          >
            <Video className="w-5 h-5" />
            <span className="text-sm font-medium">Video</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors">
            <Smile className="w-5 h-5" />
            <span className="text-sm font-medium">Feeling</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors">
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium">Location</span>
          </button>
        </div>
        
        {selectedFiles.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedFiles.length}/10 files
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default InstagramStylePostCreator;
