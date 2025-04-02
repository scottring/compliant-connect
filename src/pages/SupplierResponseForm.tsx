import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TagBadge from "@/components/tags/TagBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
// Import types from central location
import { Tag } from "@/types"; // CORRECTED IMPORT
// Import PIRRequest from pir.ts, but use Database types for enums and responses
import { PIRRequest } from "@/types/pir";
import { Database } from "@/types/supabase"; // Import generated types
type PIRStatus = Database['public']['Enums']['pir_status']; // Use generated enum
type DBPIRResponse = Database['public']['Tables']['pir_responses']['Row']; // Use generated row type
type DBFlag = Database['public']['Tables']['response_flags']['Row']; // Use generated row type for flags
import QuestionItem from "@/components/supplierResponse/QuestionItem";
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import TaskProgress from "@/components/ui/progress/TaskProgress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { toast } from "sonner";
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook

// Define Subsection and Section types based on Supabase if not imported
type Subsection = Database['public']['Tables']['subsections']['Row'];
type Section = Database['public']['Tables']['sections']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
// Define SupplierResponse locally if not imported correctly
type SupplierResponse = { id: string; questionId: string; value: any; comments?: any[]; flags?: any[] };


// Type definition for DBQuestion (assuming it's not defined elsewhere globally)
export type QuestionType = Database['public']['Enums']['question_type'];
export type DBQuestion = {
  id: string;
  subsection_id: string;
  text: string;
  description: string | null;
  type: QuestionType;
  required: boolean;
  options: any | null;
  created_at: string;
  updated_at: string;
  tags: Tag[]; // Assuming Tag type is available
};

// Type for the combined PIR data fetched by the query
interface PirDetails {
    pir: Database['public']['Tables']['pir_requests']['Row']; // Use generated Row type
    product: { id: string; name: string; } | null; // Simplified product type based on usage
    supplier: Company | null;
    customer: Company | null;
    tags: Tag[];
    questions: (DBQuestion & {
        subsection?: Subsection & { section?: Section };
    })[];
    // Update responses type to include optional flags
    responses: (DBPIRResponse & { response_flags?: DBFlag[] })[];
}


const SupplierResponseForm = () => {
  const { id: pirId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get user from auth context
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // --- Fetch PIR Details Query ---
  const fetchPirDetails = async (id: string): Promise<PirDetails> => {
      const { data: pirData, error: pirError } = await supabase
          .from('pir_requests')
          .select(`
              *,
              product:products (*),
              supplier:companies!pir_requests_supplier_company_id_fkey(*),
              customer:companies!pir_requests_customer_id_fkey(*),
              pir_tags!inner ( tags (*) ),
              pir_responses ( *, response_flags ( * ) ),
              pir_questions!inner ( questions ( *, subsection:subsections(*, section:sections(*)) ) )
          `)
          .eq('id', id)
          .single();

      if (pirError || !pirData) throw new Error(`Failed to fetch PIR details: ${pirError?.message ?? 'Not found'}`);

      const tags = (pirData.pir_tags?.map((pt: any) => pt.tags).filter(Boolean).flat() || []) as Tag[];
      const questions = (pirData.pir_questions?.map((pq: any) => {
          const questionData = pq.questions as any;
          if (!questionData) return null;
          const subsection = questionData.subsection as any;
          const section = subsection?.section as Section | undefined; // Use local type
          return {
              ...questionData,
              tags: [], // Assuming tags are not directly on question in this join
              // Use order_index from schema
              subsection: subsection ? { ...subsection, order_index: subsection.order_index, section: section ? { ...section, order_index: section.order_index } : undefined } : undefined
          };
      }).filter(Boolean) || []) as (DBQuestion & { subsection?: Subsection & { section?: Section } })[]; // Use local types

      questions.sort((a, b) => {
          const sectionOrderA = a.subsection?.section?.order_index || 0; // Use order_index
          const sectionOrderB = b.subsection?.section?.order_index || 0; // Use order_index
          if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;
          const subsectionOrderA = a.subsection?.order_index || 0; // Use order_index
          const subsectionOrderB = b.subsection?.order_index || 0; // Use order_index
          return subsectionOrderA - subsectionOrderB;
      });

      // Cast the main PIR data using generated Row type
      const safePirData = pirData as Database['public']['Tables']['pir_requests']['Row'];

      return {
          pir: safePirData,
          product: pirData.product as any,
          supplier: pirData.supplier as Company | null, // Use local type
          customer: pirData.customer as Company | null, // Use local type
          tags: tags,
          questions: questions,
          // Ensure responses include flags
          responses: (pirData.pir_responses || []) as (DBPIRResponse & { response_flags?: DBFlag[] })[],
      };
  };

  const {
      data: pirDetails,
      isLoading: isLoadingPir,
      error: errorPir,
  } = useQuery<PirDetails, Error>({
      queryKey: ['pirDetails', pirId],
      queryFn: () => fetchPirDetails(pirId!),
      enabled: !!pirId, // Fetch always when pirId is present
  });
  // --- End Fetch PIR Details Query ---


  // --- Mutations ---
  // Mutation to save/update a single answer
  const upsertResponseMutation = useMutation({
    mutationFn: async (responseData: { question_id: string; answer: any; status?: DBPIRResponse['status'] }) => {
        if (!pirId || !user) throw new Error("Missing PIR ID or User");

        // Check if response exists
        const { data: existing, error: checkError } = await supabase
            .from('pir_responses')
            .select('id')
            .eq('pir_id', pirId)
            .eq('question_id', responseData.question_id)
            .maybeSingle();

        if (checkError) throw checkError;

        const dataToUpsert: Database['public']['Tables']['pir_responses']['Insert'] | Database['public']['Tables']['pir_responses']['Update'] = {
            pir_id: pirId,
            question_id: responseData.question_id,
            answer: responseData.answer,
            status: responseData.status || 'draft', // Default to draft if not provided
            // user_id: user.id // Add user_id if your schema requires it
        };

        if (existing?.id) {
            // Update existing response
            const { error } = await supabase
                .from('pir_responses')
                .update({ ...dataToUpsert, updated_at: new Date().toISOString() }) // Ensure updated_at is set
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            // Insert new response
            const { error } = await supabase
                .from('pir_responses')
                .insert(dataToUpsert);
            if (error) throw error;
        }
    },
    onSuccess: () => {
        // Invalidate query to refetch data after update
        queryClient.invalidateQueries({ queryKey: ['pirDetails', pirId] });
        // toast.success("Answer saved!"); // Optional: feedback on each save
    },
    onError: (error) => {
        console.error("Error saving response:", error);
        toast.error(`Failed to save answer: ${error.message}`);
    },
  });

  // Mutation to submit the entire response set
  const submitPIRMutation = useMutation({
      mutationFn: async () => {
          if (!pirId) throw new Error("Missing PIR ID");
          // Update PIR status to pending_review
          const { error } = await supabase
              .from('pir_requests')
              .update({ status: 'pending_review', updated_at: new Date().toISOString() })
              .eq('id', pirId);
          if (error) throw error;
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['pirDetails', pirId] });
          queryClient.invalidateQueries({ queryKey: ['pirRequests'] }); // Invalidate list view
          toast.success("Response submitted successfully!");
          // Optionally navigate away or show success state
          navigate(`/product-sheets`); // Example: navigate back to list
      },
      onError: (error) => {
          console.error("Error submitting PIR:", error);
          toast.error(`Failed to submit response: ${error.message}`);
      },
  });
  // --- End Mutations ---


  // --- Derived State and Logic (using pirDetails) ---
  const productSheet = pirDetails?.pir; // This is pir_requests Row type
  const supplier = pirDetails?.supplier;
  const requester = pirDetails?.customer;
  const sheetQuestions = pirDetails?.questions ?? [];
  const sheetTags = pirDetails?.tags ?? [];
  const sheetResponses = pirDetails?.responses ?? []; // This is DBPIRResponse[]

  // Initialize expanded sections
  useEffect(() => {
      if (sheetQuestions.length > 0) {
        const initialExpandedState = sheetQuestions.reduce((acc, q) => {
          const sectionId = q.subsection?.section?.id;
          if (sectionId) {
            acc[sectionId] = true; // Default to expanded
          }
          return acc;
        }, {} as Record<string, boolean>);
        setExpandedSections(initialExpandedState);
      }
  }, [sheetQuestions]);


  // Grouping logic
  const questionsBySection = sheetQuestions.reduce(
    (acc, question) => {
      const sectionId = question.subsection?.section?.id || "unsectioned";
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(question);
      return acc;
    }, {} as Record<string, (DBQuestion & { subsection?: Subsection & { section?: Section } })[]>); // Use local types

  const questionsBySubsection = Object.entries(questionsBySection).reduce(
    (acc, [sectionId, sectionQuestions]) => {
      acc[sectionId] = sectionQuestions.reduce(
        (subAcc, question) => {
          const subsectionId = question.subsection_id || "unsubsectioned";
          if (!subAcc[subsectionId]) subAcc[subsectionId] = [];
          subAcc[subsectionId].push(question);
          return subAcc;
        }, {} as Record<string, (DBQuestion & { subsection?: Subsection & { section?: Section } })[]>); // Use local types
      return acc;
    }, {} as Record<string, Record<string, (DBQuestion & { subsection?: Subsection & { section?: Section } })[]>>); // Use local types

  // Map DBPIRResponse for QuestionItem component
  // Assuming QuestionItem expects an object with at least { id, value }
  const answersMap = sheetResponses.reduce((acc, response) => {
    if (response.question_id) { // Ensure question_id is not null
        acc[response.question_id] = {
            id: response.id,
            // questionId: response.question_id, // Not strictly needed if key is question_id
            value: response.answer as any, // Map 'answer' (Json) to 'value'
            // comments: [], // Add if QuestionItem expects comments
            // flags: [], // Add if QuestionItem expects flags
        };
    }
    return acc;
  }, {} as Record<string, { id: string; value: any; /* comments?: any[]; flags?: any[] */ }>);

  // --- End Derived State ---


  // --- Event Handlers ---
  const handleSubmit = () => {
      // TODO: Add validation - ensure all required questions are answered?
      submitPIRMutation.mutate();
  };
  const handleSaveAsDraft = () => {
      // TODO: Implement saving all current answers with 'draft' status?
      toast.info("Save as Draft functionality not fully implemented.");
  };
  const handleAnswerUpdate = (questionId: string, value: any) => {
      // Call the mutation to save the answer
      upsertResponseMutation.mutate({ question_id: questionId, answer: value });
  };
  const handleAddComment = (answerId: string, text: string) => {
      // TODO: Implement comment mutation
      toast.info(`Adding comment to A:${answerId} - Not implemented.`);
  };
  // --- End Event Handlers ---


  const toggleSection = (sectionId: string) => { setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] })); };

  // Helper functions
  const getSectionName = (sectionId: string): string => {
      if (sectionId === "unsectioned") return "General Questions";
      // Find the first question belonging to this section to get the section details
      const questionInSection = sheetQuestions.find(q => q.subsection?.section?.id === sectionId);
      const section = questionInSection?.subsection?.section as Section | undefined; // Use local type
      return section ? `${section.order_index || '?'}. ${section.name}` : "Unknown Section"; // Use order_index
  };
  const getSubsectionName = (sectionId: string, subsectionId: string): string => {
      if (subsectionId === "unsubsectioned") return "General";
      // Find the first question belonging to this subsection to get the details
      const questionInSubsection = sheetQuestions.find(q => q.subsection_id === subsectionId);
      const subsection = questionInSubsection?.subsection;
      const section = subsection?.section;
      if (!section || !subsection) return "Unknown Subsection";
      return `${section.order_index || '?'}.${subsection.order_index || '?'} ${subsection.name}`; // Use order_index
  };

  const answeredQuestions = Object.keys(answersMap).length;
  const totalQuestions = sheetQuestions.length;
  const completionRate = totalQuestions > 0 ? Math.floor((answeredQuestions / totalQuestions) * 100) : 0;

  // Status display logic
  const getDisplayStatus = (): string => {
    if (!productSheet) return 'loading...';
    // Use correct enum values from PIRStatus
    // Example logic - adjust based on actual workflow
    if (productSheet.status === "draft" && completionRate > 0) return "Draft (In Progress)";
    if (productSheet.status === "submitted") return "Submitted (Pending Review)";
    // Add cases for new statuses
    if (productSheet.status === "pending_supplier") return "Pending Supplier";
    if (productSheet.status === "pending_review") return "Pending Review";
    if (productSheet.status === "accepted") return "Accepted";
    return productSheet.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const getStatusColorClass = (): string => {
     if (!productSheet) return "bg-gray-100 text-gray-800";
     // Use correct enum values from PIRStatus
     switch (productSheet.status) {
       case "approved": return "bg-green-100 text-green-800"; // Keep for potential old data
       case "accepted": return "bg-green-100 text-green-800"; // New accepted state
       case "rejected": return "bg-red-100 text-red-800";
       case "in_review": return "bg-blue-100 text-blue-800"; // Keep for potential old data
       case "pending_review": return "bg-cyan-100 text-cyan-800"; // New pending review state
       case "flagged": return "bg-yellow-100 text-yellow-800";
       case "submitted": return "bg-purple-100 text-purple-800"; // Keep for potential old data
       case "pending_supplier": return "bg-orange-100 text-orange-800"; // New pending supplier state
       default: return "bg-gray-100 text-gray-800"; // Draft
     }
  };
  // --- End Status Logic ---


  // --- Render Logic ---
  if (isLoadingPir) { return <div className="p-12 text-center">Loading PIR details...</div>; }
  if (errorPir) { return <div className="p-12 text-center text-red-500">Error loading PIR: {errorPir.message}</div>; }
  if (!pirDetails || !productSheet) { return ( <div className="py-12 text-center"> <h2 className="text-2xl font-bold mb-4">PIR not found</h2> <Button onClick={() => navigate(-1)}>Go Back</Button> </div> ); }

  const productName = pirDetails.product?.name ?? 'Unknown Product';
  const pageTitle = productSheet.title || `Supplier Response Form: ${productName}`;
  const pageSubtitle = `Requested by: ${requester?.name || 'Unknown'}`;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={pageTitle}
        description={pageSubtitle}
        actions={(
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAsDraft} disabled={submitPIRMutation.isPending}> Save as Draft </Button>
            <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit} disabled={submitPIRMutation.isPending}>
              {submitPIRMutation.isPending ? "Submitting..." : "Submit Response"}
            </Button>
          </div>
        )}
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
            <div><h3 className="font-medium text-sm text-muted-foreground mb-1">Product Name</h3><p>{productName}</p></div>
            <div><h3 className="font-medium text-sm text-muted-foreground mb-1">Date Requested</h3><p>{new Date(productSheet.created_at!).toLocaleDateString()}</p></div>
            <div><h3 className="font-medium text-sm text-muted-foreground mb-1">Description</h3><p>{productSheet.description || "N/A"}</p></div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Information Categories</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {sheetTags.map((tag) => <TagBadge key={tag.id} tag={tag} size="sm" />)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg mt-4">
             <div className="flex items-center gap-3">
               <div className="bg-emerald-100 text-emerald-800 p-2 rounded-full"> <CheckCircle className="h-5 w-5" /> </div>
               <div>
                 <h3 className="font-medium">Completion Status</h3>
                 <p className="text-sm text-muted-foreground"> {answeredQuestions} of {totalQuestions} questions answered ({completionRate}%) </p>
               </div>
             </div>
             <div className="w-32"> <TaskProgress value={completionRate} size="md" showLabel /> </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.entries(questionsBySubsection).map(([sectionId, subsections]) => (
          <Card key={sectionId}>
            <Collapsible open={expandedSections[sectionId] !== false} onOpenChange={() => toggleSection(sectionId)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <span>{getSectionName(sectionId)}</span>
                    <div className="flex items-center text-sm font-normal text-muted-foreground">
                      <span className="mr-2">{Object.values(subsections).flat().length} questions</span>
                      {expandedSections[sectionId] === false ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-8 pt-0">
                  {Object.entries(subsections).map(([subsectionId, questions]) => (
                    <div key={subsectionId} className="space-y-6">
                      <h3 className="font-medium text-lg border-b pb-2">{getSubsectionName(sectionId, subsectionId)}</h3>
                      {questions.map((question, index) => {
                        const answer = answersMap[question.id]; // Use inferred type
                        return (
                          <div key={question.id} className="border-t pt-6 first:border-t-0 first:pt-0">
                            <QuestionItem
                              question={question}
                              answer={answer} // Pass the correctly typed answer
                              productSheetId={productSheet.id} // Pass PIR ID
                              onAnswerUpdate={(value) => handleAnswerUpdate(question.id, value)}
                              onAddComment={(text) => { if (answer) handleAddComment(answer.id, text); }}
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
         <Button variant="outline" onClick={() => navigate(-1)}> Cancel </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSaveAsDraft} disabled={submitPIRMutation.isPending}> Save as Draft </Button>
          <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit} disabled={submitPIRMutation.isPending}>
             {submitPIRMutation.isPending ? "Submitting..." : "Submit Response"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierResponseForm;
