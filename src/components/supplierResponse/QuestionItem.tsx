import React, { useEffect, useState } from "react";
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
  answer?: SupplierResponse;
  productSheetId: string;
  pirStatus: PIRStatus; // Add PIR status prop
  onAnswerUpdate: (value: string | boolean | number | string[]) => void;
  onAddComment: (text: string) => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  answer,
  pirStatus, // Destructure pirStatus
  productSheetId,
  onAnswerUpdate,
  onAddComment
}) => {
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [debouncedValue, setDebouncedValue] = useState<string | number | boolean | string[] | undefined>(answer?.value as string | number | boolean | string[] | undefined); // Add type assertion
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

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
  const hasFlags = answer?.flags && answer.flags.length > 0;
  
  // Get the most recent flag
  const latestFlag = hasFlags
    ? answer?.flags?.reduce((latest, current) =>
        latest.created_at! > current.created_at! ? latest : current // Use created_at and add non-null assertion
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
      
      {hasFlags && latestFlag && (
        <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>This answer has been flagged for revision</AlertTitle>
          <AlertDescription>
            {latestFlag.comment}
          </AlertDescription>
        </Alert>
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
