import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TagBadge from "@/components/tags/TagBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
// Import types from central location
import { Tag, Company, Subsection, Section, SupplierResponse } from "../types/index"; // Use relative path
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

// Type for the combined PIR data fetched by the query
interface PirDetails {
    pir: Database['public']['Tables']['pir_requests']['Row']; // Use generated Row type
    product: { id: string; name: string; } | null;
    supplier: Company | null;
    customer: Company | null;
    tags: Tag[];
    questions: (DBQuestion & {
        subsection?: Subsection & { section?: Section };
    })[];
    responses: DBPIRResponse[]; // Use generated response type
}

// Type definition for DBQuestion
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
  tags: Tag[];
};
// End DBQuestion definition

const SupplierResponseForm = () => {
  const { id: pirId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // --- Fetch PIR Details Query ---
  const fetchPirDetails = async (id: string): Promise<PirDetails> => {
      // Step 1: Fetch PIR Request and basic related data
      const { data: pirData, error: pirError } = await supabase
          .from('pir_requests')
          .select(`
              *,
              product:products (*),
              supplier:companies!pir_requests_supplier_company_id_fkey(*),
              customer:companies!pir_requests_customer_id_fkey(*)
          `)
          .eq('id', id)
          .single();

      if (pirError || !pirData) throw new Error(`Failed to fetch PIR details: ${pirError?.message ?? 'Not found'}`);

      // Step 2: Fetch PIR Tags
      const { data: pirTagsData, error: pirTagsError } = await supabase
          .from('pir_tags')
          .select('tags (*)')
          .eq('pir_id', id);

      if (pirTagsError) console.error("Warning: Failed to fetch PIR tags:", pirTagsError.message); // Non-critical?
      const pirTags = (pirTagsData?.map((pt: any) => pt.tags).filter(Boolean).flat() || []) as Tag[];
      const pirTagIds = pirTags.map(t => t.id);

      // Step 3: Fetch Questions based on PIR Tags
      let questions: (DBQuestion & { subsection?: Subsection & { section?: Section } })[] = [];
      if (pirTagIds.length > 0) {
          const { data: questionsData, error: questionsError } = await supabase
              .from('questions')
              .select(`
                  *,
                  subsection:subsections(*, section:sections(*)),
                  question_tags!inner ( tags (*) )
              `)
              // Fetch questions whose tags intersection with pirTagIds is not empty
              // This requires joining question_tags and filtering
              // A simpler approach (though less efficient if many tags/questions)
              // is to fetch questions linked to *any* of the PIR tags.
              .in('id', (await supabase
                  .from('question_tags')
                  .select('question_id')
                  .in('tag_id', pirTagIds)).data?.map(qt => qt.question_id) || []
              );


          if (questionsError) throw new Error(`Failed to fetch questions for PIR tags: ${questionsError.message}`);

          // Process fetched questions to include tags
          questions = (questionsData || []).map((q: any) => {
              const subsection = q.subsection as any;
              const section = subsection?.section as any;
              const questionTags = (q.question_tags?.map((qt: any) => qt.tags).filter(Boolean).flat() || []) as Tag[];
              return {
                  ...q,
                  tags: questionTags,
                  subsection: subsection ? { ...subsection, order_index: subsection.order_index, section: section ? { ...section, order_index: section.order_index } : undefined } : undefined // Use order_index consistently
              };
          });

          // Sort Questions
          questions.sort((a, b) => {
              const sectionOrderA = a.subsection?.section?.order_index || 0; // Use order_index
              const sectionOrderB = b.subsection?.section?.order_index || 0; // Use order_index
              if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;
              const subsectionOrderA = a.subsection?.order_index || 0; // Use order_index
              const subsectionOrderB = b.subsection?.order_index || 0; // Use order_index
              return subsectionOrderA - subsectionOrderB;
          });
      } else {
          console.log("No tags found for this PIR, no questions will be fetched based on tags.");
      }

      // Step 4: Fetch existing Responses for this PIR (to populate answers)
      const { data: responsesData, error: responsesError } = await supabase
          .from('pir_responses')
          .select('*')
          .eq('pir_id', id);

      if (responsesError) throw new Error(`Failed to fetch existing PIR responses: ${responsesError.message}`);


      // Step 5: Combine data
      const safePirData = pirData as Database['public']['Tables']['pir_requests']['Row'];
      return {
          pir: safePirData,
          product: pirData.product as any,
          supplier: pirData.supplier as Company | null,
          customer: pirData.customer as Company | null,
          tags: pirTags, // PIR-specific tags
          questions: questions, // Questions fetched via PIR tags
          responses: (responsesData || []) as DBPIRResponse[], // Existing responses
      };
  };

  const {
      data: pirDetails,
      isLoading: isLoadingPir,
      error: errorPir,
  } = useQuery<PirDetails, Error>({
      queryKey: ['pirDetails', pirId],
      queryFn: () => fetchPirDetails(pirId!),
      enabled: !!pirId,
  });
  // --- End Fetch PIR Details Query ---


  // TODO: Add Mutations for updating/submitting responses and adding comments


  // --- Derived State and Logic (using pirDetails) ---
  const productSheet = pirDetails?.pir; // This is pir_requests Row type
  const supplier = pirDetails?.supplier;
  const requester = pirDetails?.customer;
  const sheetQuestions = pirDetails?.questions ?? [];
  const sheetTags = pirDetails?.tags ?? [];
  const sheetResponses = pirDetails?.responses ?? []; // This is DBPIRResponse[]

  // Initialize expanded sections
  useEffect(() => { /* ... */ }, [sheetQuestions]);


  // Grouping logic
  const questionsBySection = sheetQuestions.reduce(
    (acc, question) => {
      const sectionId = question.subsection?.section?.id || "unsectioned";
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(question);
      return acc;
    }, {} as Record<string, (DBQuestion & { subsection?: Subsection & { section?: Section } })[]>);

  const questionsBySubsection = Object.entries(questionsBySection).reduce(
    (acc, [sectionId, sectionQuestions]) => {
      acc[sectionId] = sectionQuestions.reduce(
        (subAcc, question) => {
          const subsectionId = question.subsection_id || "unsubsectioned";
          if (!subAcc[subsectionId]) subAcc[subsectionId] = [];
          subAcc[subsectionId].push(question);
          return subAcc;
        }, {} as Record<string, (DBQuestion & { subsection?: Subsection & { section?: Section } })[]>);
      return acc;
    }, {} as Record<string, Record<string, (DBQuestion & { subsection?: Subsection & { section?: Section } })[]>>);

  // Map DBPIRResponse to SupplierResponse for QuestionItem component
  const answersMap = sheetResponses.reduce((acc, response) => {
    acc[response.question_id!] = {
        id: response.id,
        questionId: response.question_id!,
        value: response.answer as any, // Map 'answer' (Json) to 'value'
        comments: [], // Map to empty array - Fetch actual comments if needed
        // flags: [], // Flags are not part of SupplierResponse type
    } as SupplierResponse; // Use SupplierResponse type from @/types
    return acc;
  }, {} as Record<string, SupplierResponse>);

  // --- End Derived State ---


  // --- Mutations ---
  const updateAnswerMutation = useMutation({
    mutationFn: async ({ questionId, value }: { questionId: string; value: any }) => {
      if (!pirId) throw new Error("PIR ID is missing");

      // Prepare data for upsert
      const responseData = {
        pir_id: pirId,
        question_id: questionId,
        answer: value,
        status: 'draft', // Keep status as draft when saving individual answers
      };

      // Upsert the response based on pir_id and question_id
      // Assumes a unique constraint exists on (pir_id, question_id)
      const { error } = await supabase
        .from('pir_responses')
        .upsert(responseData, { onConflict: 'pir_id, question_id' }); // Adjust onConflict if needed

      if (error) throw error;
      return responseData; // Return data on success
    },
    onSuccess: (data, variables) => {
      toast.success(`Answer saved for question ID: ${variables.questionId}`);
      // Invalidate the query cache to refetch the latest data, ensuring type consistency
      queryClient.invalidateQueries({ queryKey: ['pirDetails', pirId] });
    },
    onError: (error: Error, variables) => {
      console.error("Error saving answer:", error);
      toast.error(`Failed to save answer for question ID ${variables.questionId}: ${error.message}`);
    },
  });

  // --- Event Handlers ---
  const handleSubmit = () => { toast.info("Submit functionality not fully implemented."); };
  const handleSaveAsDraft = () => { toast.info("Save as Draft functionality not fully implemented."); };
  // Updated handler to use the mutation
  const handleAnswerUpdate = (questionId: string, value: any) => {
    console.log(`Updating answer for Q:${questionId} with value:`, value);
    updateAnswerMutation.mutate({ questionId, value });
  };
  const handleAddComment = (answerId: string, text: string) => { toast.info(`Adding comment to A:${answerId} - Not implemented.`); };
  // --- End Event Handlers ---


  const toggleSection = (sectionId: string) => { setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] })); };

  // Helper functions
  const getSectionName = (sectionId: string): string => {
      if (sectionId === "unsectioned") return "General Questions";
      const questionInSection = sheetQuestions.find(q => q.subsection?.section?.id === sectionId);
      const section = questionInSection?.subsection?.section;
      return section ? `${section.order_index || '?'}. ${section.name}` : "Unknown Section"; // Use order_index
  };
  const getSubsectionName = (sectionId: string, subsectionId: string): string => {
      if (subsectionId === "unsubsectioned") return "General";
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
    return productSheet.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const getStatusColorClass = (): string => {
     if (!productSheet) return "bg-gray-100 text-gray-800";
     // Use correct enum values from PIRStatus
     switch (productSheet.status) {
       case "approved": return "bg-green-100 text-green-800";
       case "rejected": return "bg-red-100 text-red-800";
       case "in_review": return "bg-blue-100 text-blue-800";
       case "flagged": return "bg-yellow-100 text-yellow-800"; // Use 'flagged' based on enum
       case "submitted": return "bg-purple-100 text-purple-800"; // Example for submitted
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

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={pageTitle}
        description={`Requested by: ${requester?.name || 'Unknown'}`}
        actions={(
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAsDraft}> Save as Draft </Button>
            <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit}> Submit Response </Button>
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
                        const answer: SupplierResponse | undefined = answersMap[question.id];
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
          <Button variant="outline" onClick={handleSaveAsDraft}> Save as Draft </Button>
          <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit}> Submit Response </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierResponseForm;
