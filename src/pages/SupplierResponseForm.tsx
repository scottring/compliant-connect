import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TagBadge from "@/components/tags/TagBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Question, SupplierResponse } from "@/types";
import QuestionItem from "@/components/supplierResponse/QuestionItem";
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import TaskProgress from "@/components/ui/progress/TaskProgress";

const SupplierResponseForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    productSheets, 
    companies, 
    questions, 
    tags, 
    sections, 
    subsections, 
    updateProductSheet, 
    updateSupplierResponse, 
    addComment 
  } = useApp();
  
  // Initialize with all sections expanded
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
  const requester = companies.find((c) => c.id === productSheet.requestedById);
  
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
  
  // Get all questions related to the tags in this product sheet
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
  
  // Group questions by section
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
  
  // Further group questions by subsection within each section
  const questionsBySubsection = Object.entries(questionsBySection).reduce(
    (acc, [sectionId, sectionQuestions]) => {
      acc[sectionId] = sectionQuestions.reduce(
        (subAcc, question) => {
          const subsectionId = question.subsectionId || "unsubsectioned";
          if (!subAcc[subsectionId]) {
            subAcc[subsectionId] = [];
          }
          subAcc[subsectionId].push(question);
          return subAcc;
        },
        {} as Record<string, Question[]>
      );
      return acc;
    },
    {} as Record<string, Record<string, Question[]>>
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
  
  const getSubsectionName = (sectionId: string, subsectionId: string) => {
    if (subsectionId === "unsubsectioned") return "General";
    
    const section = sections.find(s => s.id === sectionId);
    const subsection = subsections.find(s => s.id === subsectionId);
    
    if (!section || !subsection) return "Unknown Subsection";
    
    return `${section.order}.${subsection.order} ${subsection.name}`;
  };
  
  const answeredQuestions = Object.keys(answersByQuestionId).length;
  const totalQuestions = sheetQuestions.length;
  const completionRate = totalQuestions > 0 ? Math.floor((answeredQuestions / totalQuestions) * 100) : 0;
  
  const getDisplayStatus = () => {
    if (completionRate === 0 && productSheet.status === "submitted") {
      return "draft (pending submission)";
    }
    
    if (completionRate > 0 && completionRate < 100 && productSheet.status === "submitted") {
      return "partially submitted";
    }
    
    return productSheet.status;
  };
  
  const getStatusColorClass = () => {
    if (completionRate === 0 && productSheet.status === "submitted") {
      return "bg-amber-100 text-amber-800";
    }
    
    switch (productSheet.status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "reviewing":
        return "bg-blue-100 text-blue-800";
      case "submitted":
        return completionRate < 100 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800";
      default:
        return "bg-amber-100 text-amber-800";
    }
  };
  
  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title={`Supplier Response Form: ${productSheet.name}`}
        description={`Requested by: ${requester?.name || 'Unknown'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAsDraft}>
              Save as Draft
            </Button>
            <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit}>
              Submit Response
            </Button>
          </div>
        }
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Product Information Request</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-muted-foreground">Status:</span>
              <span className={`text-sm px-2 py-1 rounded capitalize ${getStatusColorClass()}`}>
                {getDisplayStatus()}
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
          
          <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg mt-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 text-emerald-800 p-2 rounded-full">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Completion Status</h3>
                <p className="text-sm text-muted-foreground">
                  {answeredQuestions} of {totalQuestions} questions answered ({completionRate}%)
                </p>
              </div>
            </div>
            <div className="w-32">
              <TaskProgress value={completionRate} size="md" showLabel />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {Object.entries(questionsBySubsection).map(([sectionId, subsections]) => (
          <Card key={sectionId}>
            <Collapsible 
              open={expandedSections[sectionId] !== false} 
              onOpenChange={() => toggleSection(sectionId)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <span>{getSectionName(sectionId)}</span>
                    <div className="flex items-center text-sm font-normal text-muted-foreground">
                      <span className="mr-2">
                        {Object.values(subsections).flat().length} questions
                      </span>
                      {expandedSections[sectionId] === false ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronUp className="h-5 w-5" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-8 pt-0">
                  {Object.entries(subsections).map(([subsectionId, questions]) => (
                    <div key={subsectionId} className="space-y-6">
                      <h3 className="font-medium text-lg border-b pb-2">
                        {getSubsectionName(sectionId, subsectionId)}
                      </h3>
                      
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
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate("/product-sheets")}>
          Cancel
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSaveAsDraft}>
            Save as Draft
          </Button>
          <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit}>
            Submit Response
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierResponseForm;
