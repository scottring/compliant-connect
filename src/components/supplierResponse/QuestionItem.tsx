import React, { useEffect, useState } from "react";
import { Flag as FlagType } from "@/types/index"; // Import Flag type and alias it
import { Question, SupplierResponse, Comment } from "@/types/index"; // Correct import path
import { DBQuestion } from "@/hooks/use-question-bank";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TagBadge from "@/components/tags/TagBadge";
import CommentsThread from "@/components/comments/CommentsThread";
import { Button } from "@/components/ui/button";
import { MessageCircle, Flag, AlertCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database } from "@/types/supabase"; // Import Database types for PIRStatus
type PIRStatus = Database['public']['Enums']['pir_status']; // Use generated enum

interface QuestionItemProps {
  question: Question | DBQuestion;
  answer?: SupplierResponse & { flags?: FlagType[] }; // Use the aliased FlagType
  productSheetId: string;
  pirStatus: PIRStatus; // Add PIR status prop
  onAnswerUpdate: (value: string | boolean | number | string[]) => void;
  onAddComment: (text: string) => void; // For general comments on the answer
  latestFlagId?: string; // ID of the latest flag to respond to
  onAddFlagResponseComment: (flagId: string, comment: string) => void; // Function to save flag response
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  answer,
  pirStatus, // Destructure pirStatus
  productSheetId,
  onAnswerUpdate,
  onAddComment,
  latestFlagId, // Destructure new props
  onAddFlagResponseComment,
}) => {
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [debouncedValue, setDebouncedValue] = useState<string | number | boolean | string[] | undefined>(answer?.value as string | number | boolean | string[] | undefined);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [flagResponseComment, setFlagResponseComment] = useState<string>(""); // State for flag response input

  // Determine if the form should be disabled based on PIR status
  const isLocked = ['submitted', 'in_review', 'approved', 'rejected'].includes(pirStatus);

  const getSchema = () => {
    switch (question.type) {
      case "text":
        return z.string().optional();
      case "number":
        return z.number().optional();
      case "boolean":
        return z.boolean().optional();
      case "single_select": // Use correct enum value
        return z.string().optional();
      case "multi_select": // Use correct enum value
        return z.array(z.string()).optional();
      case "file":
        return z.string().optional();
      default:
        return z.string().optional();
    }
  };
  
  const schema = z.object({
    answer: getSchema(),
  });
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      answer: answer?.value as string | number | boolean | string[] | undefined,
    },
  });

  useEffect(() => {
    if (answer?.value !== undefined) {
      form.setValue("answer", answer.value as string | number | boolean | string[] | undefined);
      setDebouncedValue(answer.value as string | number | boolean | string[] | undefined);
    }
  }, [answer, form]);
  
  const onSubmit = (data: z.infer<typeof schema>) => {
    if (data.answer !== undefined) {
      onAnswerUpdate(data.answer);
    }
  };

  const handleValueChange = (value: string | number | boolean | string[]) => {
    form.setValue("answer", value);

    // Clear any existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set a new timeout to save after 800ms of no typing
    const timeout = setTimeout(() => {
      if (debouncedValue !== value) {
        setDebouncedValue(value);
        onAnswerUpdate(value);
      }
    }, 800);
    
    setSaveTimeout(timeout);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Check if this answer has been flagged
  // Check if this answer has been flagged (using the passed flags)
  const flags = answer?.flags;
  const hasFlags = flags && flags.length > 0;

  // Get the most recent flag
  const latestFlag = hasFlags
    ? flags.reduce((latest, current) =>
        new Date(latest.created_at!) > new Date(current.created_at!) ? latest : current // Compare dates correctly
      )
    : null;

  // Render the appropriate input based on question type
  const renderFormControl = () => {
    switch (question.type) {
      case "text":
        return (
          <Input 
            value={form.watch("answer") as string || ""} 
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Type here..."
            disabled={isLocked} // Disable based on status
          />
        );
      
      case "number":
        return (
          <Input 
            type="number" 
            value={form.watch("answer") as number || ""} 
            onChange={(e) => handleValueChange(Number(e.target.value))}
            placeholder="Enter a number..."
            disabled={isLocked} // Disable based on status
          />
        );
      
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`question-${question.id}`}
              checked={form.watch("answer") as boolean || false}
              onCheckedChange={handleValueChange}
              disabled={isLocked} // Disable based on status
            />
            <label
              htmlFor={`question-${question.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Yes
            </label>
          </div>
        );

      case "single_select": // Use correct enum value
        return (
          <Select
            value={form.watch("answer") as string || ""}
            onValueChange={handleValueChange}
            disabled={isLocked} // Disable based on status
          >
            <SelectTrigger disabled={isLocked}> {/* Also disable trigger */}
              <SelectValue placeholder={isLocked ? "Locked" : "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select": // This one was already correct
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`question-${question.id}-${option}`}
                  checked={(form.watch("answer") as string[] || []).includes(option)}
                  disabled={isLocked} // Disable based on status
                  onCheckedChange={(checked) => {
                    const currentValues = form.watch("answer") as string[] || [];
                    if (checked) {
                      handleValueChange([...currentValues, option]);
                    } else {
                      handleValueChange(currentValues.filter(val => val !== option));
                    }
                  }}
                />
                <label 
                  htmlFor={`question-${question.id}-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      
      case "file":
        return (
          <Button 
            type="button" 
            variant="outline"
            className="w-full"
            onClick={() => alert("File upload not implemented yet")}
            disabled={isLocked} // Disable based on status
          >
            {isLocked ? "File Upload Locked" : "Start upload"}
          </Button>
        );
      
      default:
        return (
          <Input 
            value={form.watch("answer") as string || ""} 
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Type here..."
            disabled={isLocked} // Disable based on status
          />
        );
    }
  };
  
  return (
    <div className="space-y-4">
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
          
          {hasFlags && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-red-500" 
            >
              <Flag className="h-4 w-4 mr-1" />
              {answer?.flags?.length}
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
      
      {/* Display Flag Alert if flags exist */}
      {hasFlags && latestFlag && (
        <Alert variant="destructive" className="bg-yellow-50 text-yellow-800 border-yellow-200"> {/* Use warning colors */}
          <Flag className="h-4 w-4" /> {/* Use Flag icon */}
          <AlertTitle>Revision Requested</AlertTitle>
          <AlertDescription>
            <span className="font-medium">Comment:</span> {latestFlag.comment} {/* Display flag comment */}
          </AlertDescription>
        </Alert>
      )}

      {/* Section for responding to the flag */}
      {hasFlags && latestFlag && !isLocked && (
        <div className="mt-4 space-y-2 border-t pt-4">
           <label htmlFor={`flag-response-${question.id}`} className="text-sm font-medium text-gray-700 block mb-1">
               Respond to Flag Comment:
           </label>
          <Textarea
            id={`flag-response-${question.id}`}
            placeholder="Explain how you addressed the issue..."
            value={flagResponseComment}
            onChange={(e) => setFlagResponseComment(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!flagResponseComment.trim() || !latestFlagId}
              onClick={() => {
                if (latestFlagId && flagResponseComment.trim()) {
                  onAddFlagResponseComment(latestFlagId, flagResponseComment);
                  setFlagResponseComment(""); // Clear input after saving
                }
              }}
            >
              Save Response to Flag
            </Button>
          </div>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  {renderFormControl()}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              variant="secondary"
              size="sm"
              disabled={isLocked} // Disable save button too
            >
              {isLocked ? "Locked" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
      
      <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
        <CollapsibleContent className="border-t pt-4 mt-4">
          {answer && (
            <CommentsThread 
              comments={answer.comments || []} 
              answerId={answer.id}
              onAddComment={onAddComment}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default QuestionItem;
