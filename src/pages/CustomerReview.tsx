import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReviewQuestionItem from "@/components/reviews/ReviewQuestionItem";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, Flag, ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";
import { Question, SupplierResponse, ProductSheet, Flag as FlagType } from "@/types";
import TagBadge from "@/components/tags/TagBadge";

const CustomerReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    productSheets, 
    questions, 
    tags,
    companies,
    updateProductSheet 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState("all");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<string, "approved" | "flagged" | "pending">>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  
  const productSheet = productSheets.find(sheet => sheet.id === id);
  
  useEffect(() => {
    if (productSheet) {
      const initialStatus: Record<string, "approved" | "flagged" | "pending"> = {};
      const initialNotes: Record<string, string> = {};
      
      productSheet.answers.forEach(answer => {
        if (answer.flags && answer.flags.length > 0) {
          initialStatus[answer.id] = "flagged";
          initialNotes[answer.id] = answer.flags[answer.flags.length - 1].comment;
        } else {
          initialStatus[answer.id] = "pending";
          initialNotes[answer.id] = "";
        }
      });
      
      setReviewStatus(initialStatus);
      setReviewNotes(initialNotes);
      
      const sections: Record<string, boolean> = {};
      questions.forEach(question => {
        if (question.sectionId) {
          sections[question.sectionId] = true;
        }
      });
      setExpandedSections(sections);
    }
  }, [productSheet, questions]);
  
  if (!productSheet) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Sheet not found</h2>
        <Button onClick={() => navigate("/product-sheets")}>Back to Product Sheets</Button>
      </div>
    );
  }
  
  const supplier = companies.find(c => c.id === productSheet.supplierId);
  
  const questionsBySections = questions
    .filter(q => productSheet.questions.some(pq => pq.id === q.id))
    .reduce((acc, question) => {
      const sectionId = question.sectionId || "unsectioned";
      if (!acc[sectionId]) {
        acc[sectionId] = [];
      }
      acc[sectionId].push(question);
      return acc;
    }, {} as Record<string, Question[]>);
  
  const answersMap = productSheet.answers.reduce((acc, answer) => {
    acc[answer.questionId] = answer;
    return acc;
  }, {} as Record<string, SupplierResponse>);
  
  const getFilteredQuestions = (sectionQuestions: Question[]) => {
    if (activeTab === "all") {
      return sectionQuestions;
    } else if (activeTab === "flagged") {
      return sectionQuestions.filter(q => {
        const answer = answersMap[q.id];
        return answer && reviewStatus[answer.id] === "flagged";
      });
    } else if (activeTab === "approved") {
      return sectionQuestions.filter(q => {
        const answer = answersMap[q.id];
        return answer && reviewStatus[answer.id] === "approved";
      });
    } else if (activeTab === "pending") {
      return sectionQuestions.filter(q => {
        const answer = answersMap[q.id];
        return answer && reviewStatus[answer.id] === "pending";
      });
    }
    return sectionQuestions;
  };
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  const handleApprove = (answerId: string) => {
    setReviewStatus(prev => ({
      ...prev,
      [answerId]: "approved"
    }));
    
    setReviewNotes(prev => ({
      ...prev,
      [answerId]: ""
    }));
  };
  
  const handleFlag = (answerId: string, note: string) => {
    setReviewStatus(prev => ({
      ...prev,
      [answerId]: "flagged"
    }));
    
    setReviewNotes(prev => ({
      ...prev,
      [answerId]: note
    }));
  };
  
  const handleSubmitReview = () => {
    const updatedAnswers = productSheet.answers.map(answer => {
      const status = reviewStatus[answer.id];
      const note = reviewNotes[answer.id];
      
      if (status === "flagged" && note) {
        const newFlag: FlagType = {
          id: `flag-${Date.now()}`,
          answerId: answer.id,
          comment: note,
          createdBy: "current-user",
          createdByName: "Current User",
          createdAt: new Date()
        };
        
        return {
          ...answer,
          flags: [
            ...(answer.flags || []),
            newFlag
          ]
        };
      }
      
      return answer;
    });
    
    const updatedStatus: ProductSheet['status'] = "reviewing";
    
    const updatedSheet: ProductSheet = {
      ...productSheet,
      answers: updatedAnswers,
      status: updatedStatus,
      updatedAt: new Date()
    };
    
    updateProductSheet(updatedSheet);
    toast.success("Review submitted successfully");
    
    navigate("/product-sheets");
  };
  
  const totalQuestions = productSheet.questions.length;
  const approvedCount = Object.values(reviewStatus).filter(status => status === "approved").length;
  const flaggedCount = Object.values(reviewStatus).filter(status => status === "flagged").length;
  const pendingCount = Object.values(reviewStatus).filter(status => status === "pending").length;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title={`Review - ${productSheet.name}`}
        actions={
          <Button 
            className="bg-brand hover:bg-brand/90"
            onClick={handleSubmitReview}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit Review
          </Button>
        }
      />
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0">
            <div>
              <h2 className="text-xl font-semibold">{productSheet.name}</h2>
              <p className="text-muted-foreground">
                version #{productSheet.id} by {supplier?.name || "Unknown Supplier"}
              </p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" /> 
                  {approvedCount} Approved
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  <Flag className="mr-1 h-3 w-3" /> 
                  {flaggedCount} Flagged
                </Badge>
                <Badge className="bg-gray-100 text-gray-800">
                  {pendingCount} Pending
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {productSheet.tags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (tag) {
                    return <TagBadge key={tag.id} tag={tag} size="sm" />;
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Questions ({totalQuestions})</TabsTrigger>
          <TabsTrigger value="flagged">Flagged ({flaggedCount})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {Object.entries(questionsBySections).map(([sectionId, sectionQuestions]) => {
            const filteredQuestions = getFilteredQuestions(sectionQuestions);
            
            if (filteredQuestions.length === 0) {
              return null;
            }
            
            const sectionName = sectionId === "unsectioned" 
              ? "General Questions" 
              : questions.find(q => q.sectionId === sectionId)?.sectionId || "Section";
            
            return (
              <Card key={sectionId}>
                <Collapsible 
                  open={expandedSections[sectionId]} 
                  onOpenChange={() => toggleSection(sectionId)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
                    <h3 className="text-lg font-semibold">{sectionName}</h3>
                    {expandedSections[sectionId] ? 
                      <ChevronUp className="h-5 w-5" /> : 
                      <ChevronDown className="h-5 w-5" />
                    }
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <Separator />
                    {filteredQuestions.map((question, index) => {
                      const answer = answersMap[question.id];
                      
                      if (!answer) {
                        return null;
                      }
                      
                      return (
                        <div key={question.id}>
                          <ReviewQuestionItem 
                            question={question}
                            answer={answer}
                            status={reviewStatus[answer.id] || "pending"}
                            note={reviewNotes[answer.id] || ""}
                            onApprove={() => handleApprove(answer.id)}
                            onFlag={(note) => handleFlag(answer.id, note)}
                            onUpdateNote={(note) => {
                              setReviewNotes(prev => ({
                                ...prev,
                                [answer.id]: note
                              }));
                            }}
                          />
                          {index < filteredQuestions.length - 1 && <Separator />}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerReview;
