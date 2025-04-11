import React, { useEffect, useState } from "react";
import { Question, SupplierResponse, Comment } from "../../types/index"; // Explicit relative path
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TagBadge from "@/components/tags/TagBadge";
import CommentsThread from "@/components/comments/CommentsThread";
import { Button } from "@/components/ui/button";
import { MessageCircle, Flag, AlertCircle, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface QuestionItemProps {
  question: Question | DBQuestion;
  answer?: SupplierResponse;
  productSheetId: string;
  onAnswerUpdate: (value: string | boolean | number | string[] | Record<string, string>[]) => void;
  onAddComment: (text: string) => void;
  isReadOnly?: boolean;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
  question, 
  answer, 
  productSheetId,
  onAnswerUpdate,
  onAddComment,
  isReadOnly = false
}) => {
  // Log the received answer prop and its comments
  useEffect(() => {
    console.log(`QuestionItem (${question.id}): Received answer prop:`, answer);
    console.log(`QuestionItem (${question.id}): Comments in prop:`, answer?.comments);
  }, [answer, question.id]);
  const [commentsOpen, setCommentsOpen] = React.useState(false); // Reset to initially closed
  const [debouncedValue, setDebouncedValue] = useState<string | number | boolean | string[] | Record<string, string>[] | undefined>(answer?.value as string | number | boolean | string[] | Record<string, string>[] | undefined);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [feedbackText, setFeedbackText] = useState(""); // State for the new feedback input

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
      case "list_table": // Add this case
        // Assuming the value is an array of objects (rows)
        // where keys are column headers (strings) and values are strings
        return z.array(z.record(z.string())).optional();
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
    if (data.answer !== undefined && !isReadOnly) {
      onAnswerUpdate(data.answer);
    }
  };

  const handleValueChange = (value: string | number | boolean | string[] | Record<string, string>[]) => {
    if (isReadOnly) return; // Don't update if in read-only mode
    
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
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        );
      
      case "number":
        return (
          <Input 
            type="number" 
            value={form.watch("answer") as number || ""} 
            onChange={(e) => handleValueChange(Number(e.target.value))}
            placeholder="Enter a number..."
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        );
      
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id={`question-${question.id}`} 
              checked={form.watch("answer") as boolean || false} 
              onCheckedChange={handleValueChange}
              disabled={isReadOnly}
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
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
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
                  onCheckedChange={(checked) => {
                    const currentValues = form.watch("answer") as string[] || [];
                    if (checked) {
                      handleValueChange([...currentValues, option]);
                    } else {
                      handleValueChange(currentValues.filter(val => val !== option));
                    }
                  }}
                  disabled={isReadOnly}
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
            disabled={isReadOnly}
          >
            Start upload
          </Button>
        );

      case "list_table": { // Use block scope for local variables
        // Assuming question.options is an array of objects like { name: string, ... }
        const columnDefs = (question.options || []) as { name: string; [key: string]: any }[];
        // Ensure answer is treated as an array of records, default to empty array
        const tableData = (form.watch("answer") as Record<string, string>[] | undefined) || [];

        // Handler to update a specific cell in the table data
        // Handler to update a specific cell in the table data, using column name as key
        const handleCellChange = (rowIndex: number, columnName: string, value: string) => {
          if (isReadOnly) return;
          const newData = [...tableData]; // Create a mutable copy
          // Ensure the row object exists before assigning to its property
          if (!newData[rowIndex]) {
             newData[rowIndex] = {}; // Initialize if somehow missing (e.g., adding rows)
          }
          newData[rowIndex] = { ...newData[rowIndex], [columnName]: value }; // Update specific cell
          handleValueChange(newData); // Update the main form state
        };

        // Handler to add a new empty row
        const handleAddRow = () => {
          if (isReadOnly) return;
          // Create a new row object with empty strings for each column
          const newRow = columnDefs.reduce((acc, colDef) => ({ ...acc, [colDef.name]: "" }), {});
          handleValueChange([...tableData, newRow]); // Add the new row to the form state
        };

        // Handler to delete a row (Optional but good UX)
        const handleDeleteRow = (rowIndex: number) => {
          if (isReadOnly) return;
          const newData = tableData.filter((_, index) => index !== rowIndex);
          handleValueChange(newData);
        };

        return (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnDefs.map((colDef) => (
                    <TableHead key={colDef.name}>{colDef.name}</TableHead>
                  ))}
                  {!isReadOnly && <TableHead className="w-[50px]"></TableHead>} {/* Header for delete button */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columnDefs.map((colDef) => (
                      <TableCell key={colDef.name}>
                        <Input
                          value={row[colDef.name] || ""}
                          onChange={(e) => handleCellChange(rowIndex, colDef.name, e.target.value)}
                          disabled={isReadOnly}
                          readOnly={isReadOnly}
                          placeholder={`Enter ${colDef.name}...`}
                          className="min-w-[100px]" // Prevent inputs from becoming too small
                        />
                      </TableCell>
                    ))}
                    {!isReadOnly && (
                       <TableCell className="text-right">
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDeleteRow(rowIndex)}
                           aria-label="Delete row"
                         >
                           <Trash2 className="h-4 w-4 text-red-500" /> {/* Assuming Trash2 is imported */}
                         </Button>
                       </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isReadOnly && (
              <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
                Add Row
              </Button>
            )}
          </div>
        );
      } // End list_table case

      default:
        return (
          <Input 
            value={form.watch("answer") as string || ""} 
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Type here..."
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        );
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-base">
            {question.hierarchical_number && <span className="mr-2 text-muted-foreground">{question.hierarchical_number}</span>}
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {question.description && (
            <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
          )}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {question.tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}
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
          
          {!isReadOnly && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground" 
              onClick={() => setCommentsOpen(!commentsOpen)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {/* Log the length being displayed */}
              {/* {console.log(`QuestionItem (${question.id}): Rendering comment count:`, answer?.comments?.length || 0)} */}
              {answer?.comments?.length || 0}
            </Button>
          )}
        </div>
      </div>
      
      {hasFlags && latestFlag && (
        <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>This answer has been flagged for revision</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Feedback from reviewer:</p>
            <p className="italic">"{latestFlag.comment}"</p>
            <p className="mt-2 text-sm">Please update your answer based on this feedback and resubmit.</p>
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
          
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button 
                type="submit" 
                variant="secondary" 
                size="sm"
              >
                Save
              </Button>
            </div>
          )}
        </form>
      </Form>
      {/* Direct Feedback Input Section */}
      <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
        <CollapsibleContent className="mt-4 pt-4 border-t">
          <div className="space-y-2">
            <label htmlFor={`feedback-${question.id}`} className="text-sm font-medium">Your Feedback/Comment</label>
            <Textarea
              id={`feedback-${question.id}`}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Add your comment or feedback here..."
              rows={3}
              disabled={isReadOnly}
            />
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (feedbackText.trim()) {
                      onAddComment(feedbackText);
                      setFeedbackText(""); // Clear input after saving
                      setCommentsOpen(false); // Close after saving
                    }
                  }}
                  disabled={!feedbackText.trim()}
                >
                  Save Feedback
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default QuestionItem;
