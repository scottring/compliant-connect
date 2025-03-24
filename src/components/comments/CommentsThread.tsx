
import React, { useState } from "react";
import { Comment, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface CommentsThreadProps {
  comments: Comment[];
  answerId: string;
  onAddComment: (answerId: string, text: string) => void;
}

const CommentsThread: React.FC<CommentsThreadProps> = ({ 
  comments, 
  answerId, 
  onAddComment 
}) => {
  const { user } = useApp();
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    onAddComment(answerId, newComment);
    setNewComment("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative",
            comments.length > 0 && "after:absolute after:top-0 after:right-0 after:h-2 after:w-2 after:rounded-full after:bg-blue-500"
          )}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white">
        <div className="flex flex-col max-h-[400px]">
          <div className="p-3 border-b font-medium">
            Comments {comments.length > 0 && `(${comments.length})`}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[250px]">
            {sortedComments.length > 0 ? (
              sortedComments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={cn(
                    "flex gap-2 p-2 rounded-lg",
                    comment.createdBy === user?.id 
                      ? "bg-blue-50 ml-4" 
                      : "bg-gray-50 mr-4"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.createdByName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {comment.createdByName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                No comments yet
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="border-t p-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="resize-none mb-2"
              rows={2}
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="sm" 
                disabled={!newComment.trim()}
              >
                Send
              </Button>
            </div>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CommentsThread;
