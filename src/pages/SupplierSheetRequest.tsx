
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ChevronDown, ChevronRight, Circle, File, MessageCircle, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TagBadge from "@/components/tags/TagBadge";
import { Question, Answer, ProductSheet } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CommentsThread from "@/components/comments/CommentsThread";

const SupplierSheetRequest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { productSheets, companies, questions, updateProductSheet, updateAnswer, addComment } = useApp();
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Find the product sheet
  const productSheet = productSheets.find((sheet) => sheet.id === id);
  
  if (!productSheet) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Product Sheet Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The product sheet you're looking for doesn't exist.
          </p>
          <Button 
            className="mt-4" 
            onClick={() => navigate("/product-sheets")}
          >
            Back to Product Sheets
          </Button>
        </div>
      </div>
    );
  }
  
  // Find requesting company
  const requestingCompany = companies.find(
    (company) => company.id === productSheet.requestedById
  );
  
  // Find supplier company
  const supplierCompany = companies.find(
    (company) => company.id === productSheet.supplierId
  );

  // Get all questions that match the product sheet tags
  const sheetQuestions = questions.filter((question) =>
    question.tags.some((tag) => 
      productSheet.tags.includes(tag.id)
    )
  ).sort((a, b) => {
    // Sort by section, subsection, and order
    const sectionA = a.sectionId || "";
    const sectionB = b.sectionId || "";
    if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
    
    const subsectionA = a.subsectionId || "";
    const subsectionB = b.subsectionId || "";
    if (subsectionA !== subsectionB) return subsectionA.localeCompare(subsectionB);
    
    return (a.order || 0) - (b.order || 0);
  });

  // Group questions by section and subsection
  const groupedQuestions: Record<string, Record<string, Question[]>> = {};
  
  sheetQuestions.forEach((question) => {
    const sectionId = question.sectionId || "uncategorized";
    const subsectionId = question.subsectionId || "default";
    
    if (!groupedQuestions[sectionId]) {
      groupedQuestions[sectionId] = {};
    }
    
    if (!groupedQuestions[sectionId][subsectionId]) {
      groupedQuestions[sectionId][subsectionId] = [];
    }
    
    groupedQuestions[sectionId][subsectionId].push(question);
  });

  // Find answer for a question
  const findAnswer = (questionId: string): Answer | undefined => {
    return productSheet.answers.find((answer) => answer.questionId === questionId);
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections({
      ...expandedSections,
      [sectionId]: !expandedSections[sectionId],
    });
  };

  // Handle answer changes
  const handleAnswerChange = (questionId: string, value: any) => {
    updateAnswer(productSheet.id, questionId, value);
  };

  // Handle form submission
  const handleSubmit = () => {
    // Check if all required questions are answered
    const unansweredRequired = sheetQuestions.filter(
      (q) => q.required && !findAnswer(q.id)
    );
    
    if (unansweredRequired.length > 0) {
      toast.error(`Please answer all required questions (${unansweredRequired.length} remaining)`);
      return;
    }
    
    // Update product sheet status
    const updatedSheet: ProductSheet = {
      ...productSheet,
      status: "submitted",
      updatedAt: new Date(),
    };
    
    updateProductSheet(updatedSheet);
    toast.success("Product sheet submitted successfully");
    navigate("/supplier-products");
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Sheet Request - ${productSheet.name}`}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Submit Response
            </Button>
          </div>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Information about the requested product sheet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Sheet Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-1">Request from</h3>
                  <p>{requestingCompany?.name || "Unknown Company"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Date Requested</h3>
                  <p>
                    {formatDistanceToNow(new Date(productSheet.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Product Name</h3>
                  <p>{productSheet.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Status</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      productSheet.status === "draft" ? "bg-gray-500" :
                      productSheet.status === "submitted" ? "bg-blue-500" :
                      productSheet.status === "reviewing" ? "bg-yellow-500" :
                      productSheet.status === "approved" ? "bg-green-500" :
                      "bg-red-500"
                    }`}></span>
                    <span className="capitalize">{productSheet.status}</span>
                  </div>
                </div>
              </div>
              
              {/* Tags */}
              {productSheet.tags && productSheet.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Compliance Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {productSheet.tags.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      return tag ? (
                        <TagBadge key={tag.id} tag={tag} />
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {/* Description */}
              {productSheet.description && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <p className="text-gray-700">{productSheet.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Questions */}
          <div className="mt-6 space-y-6">
            {Object.entries(groupedQuestions).map(([sectionId, subsections]) => {
              const isExpanded = expandedSections[sectionId] !== false; // Default to expanded
              
              return (
                <Card key={sectionId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {sectionId === "uncategorized" ? "General Questions" : 
                          sections.find(s => s.id === sectionId)?.name || sectionId}
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSection(sectionId)}
                      >
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-6">
                        {Object.entries(subsections).map(([subsectionId, questions]) => (
                          <div key={subsectionId} className="space-y-4">
                            {subsectionId !== "default" && (
                              <h3 className="font-medium border-b pb-2">
                                {subsections.find(s => s.id === subsectionId)?.name || subsectionId}
                              </h3>
                            )}
                            
                            {questions.map((question) => {
                              const answer = findAnswer(question.id);
                              return (
                                <div key={question.id} className="border rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium">
                                          {question.text}
                                          {question.required && (
                                            <span className="text-red-500 ml-1">*</span>
                                          )}
                                        </h4>
                                        {answer && (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {question.tags.map((tag) => (
                                          <TagBadge key={tag.id} tag={tag} size="sm" />
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {/* Comments button */}
                                    {answer && (
                                      <CommentsThread 
                                        comments={answer.comments || []} 
                                        answerId={answer.id}
                                        onAddComment={addComment}
                                      />
                                    )}
                                  </div>
                                  
                                  {/* Question input based on type */}
                                  <div className="mt-3">
                                    {question.type === "text" && (
                                      <>
                                        <Textarea
                                          value={answer?.value as string || ""}
                                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                          placeholder="Type your answer here..."
                                          className="w-full"
                                        />
                                        <div className="flex justify-end mt-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => toast.success("Answer saved")}
                                          >
                                            <Save className="h-4 w-4 mr-1" />
                                            Save
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                    
                                    {question.type === "number" && (
                                      <>
                                        <Input
                                          type="number"
                                          value={answer?.value as number || ""}
                                          onChange={(e) => handleAnswerChange(question.id, parseFloat(e.target.value))}
                                          placeholder="Enter a number"
                                          className="w-full"
                                        />
                                        <div className="flex justify-end mt-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => toast.success("Answer saved")}
                                          >
                                            <Save className="h-4 w-4 mr-1" />
                                            Save
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                    
                                    {question.type === "boolean" && (
                                      <div className="flex items-center space-x-4">
                                        <Button
                                          variant={answer?.value === true ? "default" : "outline"}
                                          onClick={() => handleAnswerChange(question.id, true)}
                                          className="flex-1"
                                        >
                                          Yes
                                        </Button>
                                        <Button
                                          variant={answer?.value === false ? "default" : "outline"}
                                          onClick={() => handleAnswerChange(question.id, false)}
                                          className="flex-1"
                                        >
                                          No
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {question.type === "select" && (
                                      <Select
                                        value={answer?.value as string || ""}
                                        onValueChange={(value) => handleAnswerChange(question.id, value)}
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
                                    )}
                                    
                                    {question.type === "multi-select" && (
                                      <>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {question.options?.map((option) => {
                                            const selected = Array.isArray(answer?.value) 
                                              ? (answer?.value as string[]).includes(option)
                                              : false;
                                            
                                            return (
                                              <Button
                                                key={option}
                                                variant={selected ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                  const currentValue = Array.isArray(answer?.value) 
                                                    ? [...answer.value as string[]] 
                                                    : [];
                                                  
                                                  if (selected) {
                                                    // Remove option
                                                    handleAnswerChange(
                                                      question.id, 
                                                      currentValue.filter((v) => v !== option)
                                                    );
                                                  } else {
                                                    // Add option
                                                    handleAnswerChange(
                                                      question.id,
                                                      [...currentValue, option]
                                                    );
                                                  }
                                                }}
                                              >
                                                {selected && <CheckCircle className="h-4 w-4 mr-2" />}
                                                {option}
                                              </Button>
                                            );
                                          })}
                                        </div>
                                        <div className="flex justify-end mt-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => toast.success("Answer saved")}
                                          >
                                            <Save className="h-4 w-4 mr-1" />
                                            Save
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                    
                                    {question.type === "file" && (
                                      <div>
                                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                          <File className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                          <p className="text-sm text-gray-500 mb-2">
                                            Drag and drop your file here, or click to browse
                                          </p>
                                          <Input
                                            type="file"
                                            className="hidden"
                                            id={`file-upload-${question.id}`}
                                            onChange={(e) => {
                                              const files = e.target.files;
                                              if (files && files.length > 0) {
                                                // In a real app, you'd upload the file and save the URL
                                                handleAnswerChange(question.id, files[0].name);
                                                toast.success(`File "${files[0].name}" uploaded`);
                                              }
                                            }}
                                          />
                                          <Button asChild>
                                            <label htmlFor={`file-upload-${question.id}`}>
                                              Browse Files
                                            </label>
                                          </Button>
                                        </div>
                                        
                                        {answer?.value && (
                                          <div className="mt-3 bg-gray-50 rounded p-2 flex items-center justify-between">
                                            <div className="flex items-center">
                                              <File className="h-4 w-4 mr-2 text-blue-500" />
                                              <span className="text-sm">{answer.value as string}</span>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                handleAnswerChange(question.id, "");
                                                toast.success("File removed");
                                              }}
                                            >
                                              Remove
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {question.type === "table" && (
                                      <div className="mt-2">
                                        <div className="border rounded-md overflow-hidden">
                                          <div className="bg-gray-100 p-2 flex items-center justify-between">
                                            <span className="font-medium">Table Input</span>
                                            <Button
                                              size="sm"
                                              onClick={() => toast.info("Table editing functionality will be implemented soon")}
                                            >
                                              Add a row
                                            </Button>
                                          </div>
                                          <div className="p-4 text-center text-gray-500">
                                            <p>Table input functionality will be implemented soon</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>
        
        {/* Sidebar */}
        <div>
          <div className="sticky top-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion</span>
                    <span>
                      {Math.round((productSheet.answers.length / sheetQuestions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.round((productSheet.answers.length / sheetQuestions.length) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Answered</span>
                    </div>
                    <span>{productSheet.answers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Circle className="h-4 w-4 text-gray-300 mr-2" />
                      <span>Unanswered</span>
                    </div>
                    <span>{sheetQuestions.length - productSheet.answers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MessageCircle className="h-4 w-4 text-blue-500 mr-2" />
                      <span>Comments</span>
                    </div>
                    <span>
                      {productSheet.answers.reduce(
                        (total, answer) => total + (answer.comments?.length || 0), 
                        0
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Requester</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="font-medium">{requestingCompany?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact Person</p>
                    <p className="font-medium">{requestingCompany?.contactName || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{requestingCompany?.contactEmail || "Unknown"}</p>
                  </div>
                  {requestingCompany?.contactPhone && (
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{requestingCompany.contactPhone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Button 
              className="w-full"
              onClick={handleSubmit}
            >
              Submit Response
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierSheetRequest;
