import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Question, SupplierResponse, ProductSheet, Tag } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CommentsThread from "@/components/comments/CommentsThread";

const SupplierPIRResponse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { productSheets, companies, questions, tags, sections, subsections, updateProductSheet, updateSupplierResponse, addComment } = useApp();
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const productSheet = productSheets.find((ps) => ps.id === id);
  
  if (!productSheet) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Information Request not found</h2>
        <Button onClick={() => navigate("/product-sheets")}>Back to Product Sheets</Button>
      </div>
    );
  }
  
  const supplier = companies.find((c) => c.id === productSheet.supplierId);
  
  if (!supplier) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Supplier not found</h2>
        <Button onClick={() => navigate("/product-sheets")}>Back to Product Sheets</Button>
      </div>
    );
  }
  
  const answersByQuestionId = productSheet.answers.reduce(
    (acc, answer) => {
      acc[answer.questionId] = answer;
      return acc;
    },
    {} as Record<string, SupplierResponse>
  );
  
  const sheetQuestions = questions.filter((question) =>
    question.tags.some((tag) => 
      productSheet.tags.some(tagId => tagId === tag.id)
    )
  ).sort((a, b) => {
    const sectionOrderA = sections.find(s => s.id === a.sectionId)?.order || 0;
    const sectionOrderB = sections.find(s => s.id === b.sectionId)?.order || 0;
    
    if (sectionOrderA !== sectionOrderB) {
      return sectionOrderA - sectionOrderB;
    }
    
    const subsectionOrderA = subsections.find(s => s.id === a.subsectionId)?.order || 0;
    const subsectionOrderB = subsections.find(s => s.id === b.subsectionId)?.order || 0;
    
    if (subsectionOrderA !== subsectionOrderB) {
      return subsectionOrderA - subsectionOrderB;
    }
    
    return (a.order || 0) - (b.order || 0);
  });
  
  const questionsBySection = sheetQuestions.reduce(
    (acc, question) => {
      const sectionId = question.sectionId || "unsectioned";
      if (!acc[sectionId]) {
        acc[sectionId] = [];
      }
      acc[sectionId].push(question);
      return acc;
    },
    {} as Record<string, Question[]>
  );
  
  const handleSubmit = () => {
    updateProductSheet({
      ...productSheet,
      status: "submitted",
    });
    navigate("/product-sheets");
  };
  
  const handleSaveAsDraft = () => {
    updateProductSheet({
      ...productSheet,
      status: "draft",
    });
    navigate("/product-sheets");
  };
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };
  
  const getSectionName = (sectionId: string) => {
    if (sectionId === "unsectioned") return "General Questions";
    const section = sections.find(s => s.id === sectionId);
    return section ? `${section.order}. ${section.name}` : "Unknown Section";
  };
  
  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title={`Product Information Request: ${productSheet.name}`}
        description={`Supplier: ${supplier.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAsDraft}>
              Save as Draft
            </Button>
            <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit}>
              Submit PIR Response
            </Button>
          </div>
        }
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>PIR Details</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-muted-foreground">Status:</span>
              <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded capitalize">
                {productSheet.status}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Product Name</h3>
              <p>{productSheet.name}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Date Requested</h3>
              <p>{new Date(productSheet.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Description</h3>
              <p>{productSheet.description || "No description provided"}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Information Categories</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {productSheet.tags.map((tagId) => {
                  const tag = tags.find(t => t.id === tagId);
                  return tag ? <TagBadge key={tag.id} tag={tag} size="sm" /> : null;
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {Object.entries(questionsBySection).map(([sectionId, questions]) => (
          <Card key={sectionId}>
            <Collapsible 
              open={expandedSections[sectionId] !== false} 
              onOpenChange={() => toggleSection(sectionId)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <span>{getSectionName(sectionId)}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {expandedSections[sectionId] === false ? "Show" : "Hide"} {questions.length} questions
                    </span>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-8 pt-0">
                  {questions.map((question) => {
                    const answer = answersByQuestionId[question.id];
                    return (
                      <div key={question.id} className="border-t pt-6 first:border-t-0 first:pt-0">
                        <QuestionItem 
                          question={question} 
                          answer={answer} 
                          productSheetId={productSheet.id}
                          onAnswerUpdate={(value) => 
                            updateSupplierResponse(productSheet.id, question.id, value)
                          }
                          onAddComment={(text) => {
                            if (answer) {
                              addComment(answer.id, text);
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};

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
  onAnswerUpdate,
  onAddComment
}) => {
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
        <span className="text-xs bg-secondary px-2 py-1 rounded capitalize">
          {question.type}
        </span>
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
                    />
                  )}
                  
                  {question.type === "number" && (
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value as number || ""} 
                      onChange={(e) => handleValueChange(Number(e.target.value))}
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      
      {answer && (
        <CommentsThread 
          comments={answer.comments || []} 
          answerId={answer.id}
          onAddComment={onAddComment}
        />
      )}
    </div>
  );
};

export default SupplierPIRResponse;
