
import React, { useEffect } from "react";
import { Question, SupplierResponse, Comment } from "@/types";
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
import { MessageCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface QuestionItemProps {
  question: Question;
  answer?: SupplierResponse;
  productSheetId: string;
  onAnswerUpdate: (value: string | boolean | number | string[]) => void;
  onAddComment: (text: string) => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
  question, 
  answer, 
  productSheetId,
  onAnswerUpdate,
  onAddComment
}) => {
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  
  const getSchema = () => {
    switch (question.type) {
      case "text":
        return z.string().optional();
      case "number":
        return z.number().optional();
      case "boolean":
        return z.boolean().optional();
      case "select":
        return z.string().optional();
      case "multi-select":
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
      answer: answer?.value,
    },
  });
  
  useEffect(() => {
    if (answer?.value !== undefined) {
      form.setValue("answer", answer.value);
    }
  }, [answer, form]);
  
  const onSubmit = (data: z.infer<typeof schema>) => {
    if (data.answer !== undefined) {
      onAnswerUpdate(data.answer);
    }
  };
  
  const handleValueChange = (value: any) => {
    form.setValue("answer", value);
    onAnswerUpdate(value);
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
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  {question.type === "text" && (
                    <Input 
                      {...field} 
                      value={field.value as string || ""} 
                      onChange={(e) => handleValueChange(e.target.value)}
                      placeholder="Type here..."
                    />
                  )}
                  
                  {question.type === "number" && (
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value as number || ""} 
                      onChange={(e) => handleValueChange(Number(e.target.value))}
                      placeholder="Enter a number..."
                    />
                  )}
                  
                  {question.type === "boolean" && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`question-${question.id}`} 
                        checked={field.value as boolean || false} 
                        onCheckedChange={handleValueChange}
                      />
                      <label 
                        htmlFor={`question-${question.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Yes
                      </label>
                    </div>
                  )}
                  
                  {question.type === "select" && question.options && (
                    <Select 
                      value={field.value as string || ""} 
                      onValueChange={handleValueChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {question.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {question.type === "multi-select" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`question-${question.id}-${option}`} 
                            checked={(field.value as string[] || []).includes(option)} 
                            onCheckedChange={(checked) => {
                              const currentValues = field.value as string[] || [];
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
                  )}
                  
                  {question.type === "file" && (
                    <div className="space-y-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => alert("File upload not implemented yet")}
                      >
                        Start upload
                      </Button>
                    </div>
                  )}
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
            >
              Save
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
