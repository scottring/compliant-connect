import React, { useState } from "react";
import { Question, QuestionType, SupplierResponse } from "../../types/index"; // Use relative path
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import TagBadge from "@/components/tags/TagBadge";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Flag,
  MessageCircle,
  Clock,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CommentsThread from "@/components/comments/CommentsThread";
import { toast } from "sonner";
import { Database } from "@/types/supabase";

// Define types for component material list
type Material = Database['public']['Tables']['pir_response_component_materials']['Row'];
type Component = Database['public']['Tables']['pir_response_components']['Row'] & {
  materials: Material[];
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success";

interface ReviewQuestionItemProps {
  question: Question;
  answer?: SupplierResponse; // Make answer optional
  status: "approved" | "flagged" | "pending";
  note: string;
  onApprove: () => void;
  onFlag: (note: string) => void;
  onUpdateNote: (note: string) => void;
  isLocked: boolean; // Add prop to disable controls when PIR is approved
  // isPreviouslyFlagged?: boolean; // This will be derived internally now
}

const ReviewQuestionItem: React.FC<ReviewQuestionItemProps> = ({
  question,
  answer,
  status,
  note,
  onApprove,
  onFlag,
  onUpdateNote,
  isLocked, // Receive the isLocked prop
  // isPreviouslyFlagged = false, // Removed from props
}) => {
  console.log("ReviewQuestionItem - question prop:", question); // ADD THIS LOG
  console.log(`ReviewQuestionItem Props for Q:${question.id}`, { question, answer, status, note }); // Re-add log
  // Log received props
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [flagHistoryOpen, setFlagHistoryOpen] = useState(false);
  
  const formatAnswerValue = () => {
    // Handle undefined answer
    if (!answer || answer.value === undefined || answer.value === null) {
      return <span className="text-muted-foreground italic">No answer provided</span>;
    }

    // Handle component_material_list type
    if (question.type === 'component_material_list') {
      console.log(`ReviewQuestionItem Q:${question.id} - Received answer.value for component_material_list:`, JSON.stringify(answer?.value, null, 2)); // ADD THIS LOG
      try {
        // The answer.value should be an array of components from the database
        const components = answer?.value as Component[]; // Correctly access data from answer.value

        if (!answer || !Array.isArray(components) || components.length === 0) { // Add check for answer existence
          return <span className="text-muted-foreground italic">No components listed</span>;
        }

        return (
          <div className="space-y-3">
            {components.map((component) => (
              <div key={component.id} className="border rounded p-2 bg-background">
                <p className="font-medium">{component.component_name || "Unnamed Component"} {component.position ? `(${component.position})` : ''}</p>
                {component.materials && component.materials.length > 0 ? (
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1">
                    {component.materials.map((material) => (
                      <li key={material.id}>
                        {material.material_name || "Unnamed Material"}: {material.percentage ?? 'N/A'}% {material.recyclable ? `(${material.recyclable})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic pl-5 mt-1">No materials listed for this component.</p>
                )}
              </div>
            ))}
          </div>
        );
      } catch (e) {
        console.error('Error rendering component_material_list:', e, answer.value);
        return <span className="text-destructive">Error displaying components</span>;
      }
    }
    
    switch (question.type as QuestionType) {
      case "text":
        return <div className="whitespace-pre-wrap">{answer.value as string}</div>;
      case "number":
        return <div>{answer.value as number}</div>;
      case "boolean":
        return <div>{(answer.value as boolean) ? "Yes" : "No"}</div>;
      case "single_select":
        return <div>{answer.value as string}</div>;
      case "multi_select":
        return (
          <div className="flex flex-wrap gap-1">
            {(answer.value as string[]).map((value, index) => (
              <Badge key={index} variant="outline">{value}</Badge>
            ))}
          </div>
        );
      case "file":
        return <div className="text-blue-600 underline">{answer.value as string}</div>;
      // Removed redundant component_material_list case - handled above the switch
      default:
        // Attempt to stringify if it's an object/array, otherwise default string conversion
        if (typeof answer.value === 'object' && answer.value !== null) {
          try {
            // Use pre for better formatting of JSON string
            return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(answer.value, null, 2)}</pre>;
          } catch (e) {
            // Fallback if stringify fails (should be rare)
            return <div>{String(answer.value)}</div>;
          }
        }
        // Default for primitive types not explicitly handled
        return <div>{String(answer.value)}</div>;
    }
  };
  
  const handleSubmitFlag = () => {
    if (!note.trim()) {
      toast.error("Please add a note before flagging");
      return;
    }
    
    onFlag(note);
  };
  
  // Sort flags by creation date (newest first) - Handle undefined answer
  const sortedFlags = answer?.flags ?
    [...answer.flags].sort((a, b) =>
      new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    ) : [];
  
  const latestFlag = answer && sortedFlags.length > 0 ? sortedFlags[0] : null;
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-base">
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <div className="flex gap-1 mt-1">
            {question.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-secondary px-2 py-1 rounded capitalize">
            {question.type}
          </span>
          
          {/* Determine isPreviouslyFlagged based on optional answer */}
          {answer?.flags && answer.flags.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-amber-500" 
              onClick={() => setFlagHistoryOpen(!flagHistoryOpen)}
            >
              <Clock className="h-4 w-4 mr-1" />
              {sortedFlags.length}
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground" 
            onClick={() => setCommentsOpen(!commentsOpen)}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {answer?.comments?.length || 0}
          </Button>
        </div>
      </div>
      
      <div className="bg-muted/30 rounded-md p-3">
        {formatAnswerValue()}
      </div>
      
      {/* Flag history section */}
      {/* Only show flag history if answer exists and has flags */}
      {answer?.flags && answer.flags.length > 0 && (
        <Collapsible open={flagHistoryOpen} onOpenChange={setFlagHistoryOpen}>
          <CollapsibleTrigger className="flex items-center space-x-2 text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors">
            <Flag className="h-4 w-4" />
            <span>Previous Flag Issues {flagHistoryOpen ? 'Hide' : 'Show'}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-2">
              {sortedFlags.map((flag) => (
                <div 
                  key={flag.id} 
                  className="bg-amber-50 border border-amber-200 rounded p-3"
                >
                  <p className="text-sm font-medium">
                    <span className="text-amber-800">{flag.createdByName}</span> 
                    <span className="text-gray-500 ml-2">
                      {new Date(flag.created_at!).toLocaleDateString()} {/* Use created_at and non-null assertion */}
                    </span>
                  </p>
                  <p className="text-amber-700 mt-1">{flag.comment}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      <div className="flex flex-col space-y-2">
        {/* Display current status indicators */}
        {status === "flagged" && !(answer?.flags && answer.flags.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-start">
              <Flag className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Flagged for revision</p>
                <p className="text-red-700">{note}</p>
              </div>
            </div>
          </div>
        )}
        
        {status === "approved" ? (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="font-medium text-green-800">Approved</p>
            </div>
          </div>
        ) : isLocked ? (
          // Show read-only status when locked but not approved
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-500 mr-2" />
              <p className="font-medium text-blue-800">
                {answer?.flags && answer.flags.length > 0 
                  ? "Pending supplier revision" 
                  : "Review in progress"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex space-x-2">
            <div className="flex-1">
              <Textarea 
                placeholder={
                  (answer?.flags && answer.flags.length > 0)
                    ? "Add feedback on the revised answer..." 
                    : "Add a review note or flag explanation..."
                }
                value={note}
                onChange={(e) => onUpdateNote(e.target.value)}
                className="min-h-[80px]"
                disabled={isLocked} // Disable textarea if locked
              />
            </div>
            {/* Only show approve/reject buttons if not locked */}
            {!isLocked && (
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  className="border-green-500 text-green-700 hover:bg-green-50"
                  onClick={onApprove}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {(answer?.flags && answer.flags.length > 0) ? "Resolve" : "Approve"}
                </Button>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          variant="outline" 
                          className="border-red-500 text-red-700 hover:bg-red-50"
                          onClick={handleSubmitFlag}
                          disabled={!note.trim()} // Disable flag button if no note
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          {(answer?.flags && answer.flags.length > 0) ? "Flag Again" : "Flag"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Please add a note before flagging</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )}
      </div>
      
      <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
        <CollapsibleContent className="border-t pt-4 mt-4">
          {/* Only show comments if answer exists */}
          {answer && (
            <CommentsThread
              comments={answer.comments || []}
              answerId={answer.id}
              onAddComment={() => {}} // Not needed for review
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ReviewQuestionItem;
