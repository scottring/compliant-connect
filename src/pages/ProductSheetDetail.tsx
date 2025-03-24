
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import TagBadge from "@/components/tags/TagBadge";
import QuestionAnswer from "@/components/productSheets/QuestionAnswer";
import { MessageCircle, Send, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";

const ProductSheetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { productSheets, companies, questions, user } = useApp();
  const [activeTab, setActiveTab] = useState("overview");

  // Find the product sheet by ID
  const productSheet = productSheets.find(ps => ps.id === id);

  if (!productSheet) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Sheet not found</h2>
        <Button onClick={() => navigate("/product-sheets")}>Back to Product Sheets</Button>
      </div>
    );
  }

  // Find the supplier
  const supplier = companies.find(company => company.id === productSheet.supplierId);
  
  // Find the requestor
  const requestor = companies.find(company => company.id === productSheet.requestedById);

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-muted/50">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-amber-500">Submitted</Badge>;
      case "reviewing":
        return <Badge className="bg-blue-500">Reviewing</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <FileText className="h-5 w-5 text-muted-foreground" />;
      case "submitted":
        return <Send className="h-5 w-5 text-amber-500" />;
      case "reviewing":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Filter questions based on the product sheet's tags
  const relevantQuestions = questions.filter(question => 
    question.tags.some(questionTag => 
      productSheet.tags.includes(questionTag.id)
    )
  );

  const handleUpdateStatus = (newStatus: "draft" | "submitted" | "reviewing" | "approved" | "rejected") => {
    toast.success(`Product sheet status updated to ${newStatus}`);
    // In a real app, this would update the product sheet status
  };

  const handleSendNotification = () => {
    toast.success(`Notification sent to ${supplier?.name}`);
    // In a real app, this would send a notification
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title={productSheet.name}
        description={`Product Sheet ID: ${productSheet.id}`}
        actions={
          <>
            <Button variant="outline" onClick={handleSendNotification}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Notify
            </Button>
            <Button 
              variant="default" 
              className="bg-brand hover:bg-brand-700"
              onClick={() => navigate("/product-sheets")}
            >
              Back to Sheets
            </Button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{productSheet.name}</CardTitle>
                {getStatusBadge(productSheet.status)}
              </div>
              <CardDescription>{productSheet.description || "No description provided"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {productSheet.tags.map(tagId => {
                  const tag = useApp().tags.find(t => t.id === tagId);
                  return tag ? <TagBadge key={tag.id} tag={tag} /> : null;
                })}
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="questions">Questions & Answers</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Name:</span>
                          <p>{productSheet.name}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Status:</span>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(productSheet.status)}
                            <span>{productSheet.status.charAt(0).toUpperCase() + productSheet.status.slice(1)}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Created:</span>
                          <p>{productSheet.createdAt?.toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Last Updated:</span>
                          <p>{productSheet.updatedAt?.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Company Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Supplier:</span>
                          <p>{supplier?.name || "Unknown supplier"}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Supplier Contact:</span>
                          <p>{supplier?.contactName || "Unknown"}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Requested By:</span>
                          <p>{requestor?.name || "Unknown requestor"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <p className="text-sm">{productSheet.description || "No description provided"}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="questions" className="space-y-4">
                  <h3 className="text-sm font-medium">Questions & Answers</h3>
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="all-questions">
                      <AccordionTrigger>View All Questions ({relevantQuestions.length})</AccordionTrigger>
                      <AccordionContent>
                        {relevantQuestions.length > 0 ? (
                          <div className="space-y-3">
                            {relevantQuestions.map(question => (
                              <QuestionAnswer 
                                key={question.id} 
                                question={question} 
                                answer={productSheet.answers.find(a => a.questionId === question.id)}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-6">No questions available for this product sheet</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* Group questions by tag */}
                    {productSheet.tags.map(tagId => {
                      const tag = useApp().tags.find(t => t.id === tagId);
                      const tagQuestions = questions.filter(q => 
                        q.tags.some(qt => qt.id === tagId)
                      );
                      
                      if (!tag || tagQuestions.length === 0) return null;
                      
                      return (
                        <AccordionItem key={tag.id} value={tag.id}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <TagBadge tag={tag} size="sm" />
                              <span>({tagQuestions.length} questions)</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {tagQuestions.map(question => (
                                <QuestionAnswer 
                                  key={question.id} 
                                  question={question} 
                                  answer={productSheet.answers.find(a => a.questionId === question.id)}
                                />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4">
                  <h3 className="text-sm font-medium">Change History</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 border-l-2 border-green-500 pl-4 pb-4">
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Product Sheet Created</p>
                        <p className="text-sm text-muted-foreground">
                          Created on {productSheet.createdAt?.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 border-l-2 border-blue-500 pl-4 pb-4">
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <Send className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Status Updated</p>
                        <p className="text-sm text-muted-foreground">
                          Status changed to {productSheet.status} on {productSheet.updatedAt?.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full md:w-1/3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleUpdateStatus("reviewing")}
              >
                <Clock className="mr-2 h-4 w-4" />
                Mark as Reviewing
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-green-600" 
                onClick={() => handleUpdateStatus("approved")}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Sheet
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600" 
                onClick={() => handleUpdateStatus("rejected")}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Reject Sheet
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={handleSendNotification}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Send Notification
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {productSheets
                  .filter(ps => ps.id !== productSheet.id && ps.supplierId === productSheet.supplierId)
                  .slice(0, 5)
                  .map(ps => (
                    <div key={ps.id} className="flex items-center justify-between">
                      <span className="text-sm hover:underline cursor-pointer" onClick={() => navigate(`/product-sheet/${ps.id}`)}>
                        {ps.name}
                      </span>
                      {getStatusBadge(ps.status)}
                    </div>
                  ))}
                {productSheets.filter(ps => ps.id !== productSheet.id && ps.supplierId === productSheet.supplierId).length === 0 && (
                  <p className="text-sm text-muted-foreground">No related product sheets</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductSheetDetail;
