
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Send, X } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { useApp } from "@/context/AppContext";

interface Comment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

interface CommentThreadProps {
  questionId: string;
  questionText: string;
  answerId?: string;
  answerValue?: string | number | boolean | string[];
}

const CommentThread: React.FC<CommentThreadProps> = ({
  questionId,
  questionText,
  answerId,
  answerValue
}) => {
  const { user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock comments (in a real app, these would come from an API or context)
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1",
      author: "John Doe",
      authorId: "u2",
      content: "Could you clarify the definition of SVHC in this context?",
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: "c2",
      author: "Sarah Johnson",
      authorId: "c1",
      content: "SVHC stands for Substances of Very High Concern as defined by REACH regulation.",
      createdAt: new Date(Date.now() - 43200000), // 12 hours ago
    },
  ]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newCommentObj: Comment = {
      id: `c${Date.now()}`,
      author: user?.name || "Anonymous",
      authorId: user?.id || "anonymous",
      content: newComment.trim(),
      createdAt: new Date(),
    };
    
    setComments([...comments, newCommentObj]);
    setNewComment("");
    setIsSubmitting(false);
    
    // In a real app, you would send a notification to the other party
    toast.success("Comment added and notification sent");
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  return (
    <div className="inline-block">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-6 w-6 rounded-full hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" />
                  {comments.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                      {comments.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-medium text-sm">Comments</h3>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-xs font-medium">Question:</p>
                  <p className="text-sm mt-1">{questionText}</p>
                  {answerValue !== undefined && (
                    <>
                      <p className="text-xs font-medium mt-2">Answer:</p>
                      <p className="text-sm mt-1">
                        {typeof answerValue === 'boolean' 
                          ? answerValue ? 'Yes' : 'No'
                          : Array.isArray(answerValue) 
                            ? answerValue.join(', ')
                            : String(answerValue)
                        }
                      </p>
                    </>
                  )}
                </div>
                
                <div className="max-h-60 overflow-y-auto p-3 space-y-3">
                  {comments.map((comment) => (
                    <Card key={comment.id} className="shadow-none border">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs">
                            {comment.author.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{comment.author}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground">No comments yet</p>
                  )}
                </div>
                
                <div className="p-3 border-t">
                  <div className="flex items-center gap-2">
                    <Textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                      className="bg-brand hover:bg-brand-700"
                    >
                      {isSubmitting ? (
                        <Send className="h-4 w-4 animate-pulse" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">View/add comments</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default CommentThread;
