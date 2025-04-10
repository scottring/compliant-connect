import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TagBadge from "@/components/tags/TagBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
// Import types from central location
import { Tag, Company, Subsection, Section, SupplierResponse } from "../types/index"; // Explicit relative path
// Import PIRRequest from pir.ts, but use Database types for enums and responses
import { PIRRequest } from "@/types/pir";
import { Database } from "@/types/supabase"; // Import generated types
import { Json } from '@/types/supabase'; // Import Json type
type PIRStatus = Database['public']['Enums']['pir_status']; // Use generated enum
type DBPIRResponse = Database['public']['Tables']['pir_responses']['Row']; // Use generated row type
type DBFlag = Database['public']['Tables']['response_flags']['Row']; // Use generated row type for flags
import QuestionItem from "@/components/supplierResponse/QuestionItem";
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import TaskProgress from "@/components/ui/progress/TaskProgress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { toast } from "sonner";
import { useCompanyData } from '@/hooks/use-company-data'; // Import useCompanyData

// Type for the combined PIR data fetched by the query
interface PirDetails {
    pir: Database['public']['Tables']['pir_requests']['Row']; // Use generated Row type
    product: { id: string; name: string; } | null;
    supplier: Company | null;
    customer: Company | null;
    tags: Tag[];
    questions: (DBQuestion & {
        // Use generated types for the actual structure based on question_sections
        question_sections?: Database['public']['Tables']['question_sections']['Row'] & {
            parent_section?: Database['public']['Tables']['question_sections']['Row']; // Parent section via parent_id
        };
    })[];
    responses: DBPIRResponse[]; // Use generated response type
}

// Type definition for DBQuestion
export type QuestionType = Database['public']['Enums']['question_type'];
export type DBQuestion = {
  id: string;
  section_id: string | null; // Matches schema
  text: string;
  description: string | null;
  type: QuestionType;
  required: boolean | null; // Corrected type to match schema
  options: Json | null; // Corrected type to match schema (assuming Json is imported or defined)
  created_at: string | null; // Corrected type to match schema
  updated_at: string | null; // Corrected type to match schema
  order_index: number; // Added missing property from schema
  tags: Tag[]; // Keep locally added tags property
};
// End DBQuestion definition

const SupplierResponseForm = () => {
  const { id: pirId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentCompany } = useCompanyData(); // Get current company context

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

      // Removed incomplete if statement after log removal
      const pirTags = (pirTagsData?.map((pt: any) => pt.tags).filter(Boolean).flat() || []) as Tag[];
      const pirTagIds = pirTags.map(t => t.id);

      // Step 3: Fetch Questions based on PIR Tags
      let questions: (DBQuestion & { subsection?: Subsection & { section?: Section } })[] = [];
      if (pirTagIds.length > 0) {
          const { data: questionsData, error: questionsError } = await supabase
              .from('questions')
              .select(`
                  *,
                  question_sections(*, parent_section:question_sections(*)),
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
              const currentSection = q.question_sections as any; // Renamed from subsection
              const parentSection = currentSection?.parent_section as any; // Renamed from section
              const questionTags = (q.question_tags?.map((qt: any) => qt.tags).filter(Boolean).flat() || []) as Tag[];
              return {
                  ...q,
                  tags: questionTags,
                  // Keep the nested structure consistent with PirDetails interface
                  question_sections: currentSection ? {
                      ...currentSection,
                      parent_section: parentSection ? { ...parentSection } : undefined
                  } : undefined
              };
          });

          // Sort Questions
          // Explicitly type a and b based on the updated PirDetails['questions'] element type
          questions.sort((a: PirDetails['questions'][number], b: PirDetails['questions'][number]) => {
              // Sort by parent section order_index first, then current section order_index, then question order_index
              // Use 0 for null order_index to ensure consistent sorting
              const parentOrderA = a.question_sections?.parent_section?.order_index ?? 0;
              const parentOrderB = b.question_sections?.parent_section?.order_index ?? 0;
              if (parentOrderA !== parentOrderB) return parentOrderA - parentOrderB;

              const currentOrderA = a.question_sections?.order_index ?? 0;
              const currentOrderB = b.question_sections?.order_index ?? 0;
              if (currentOrderA !== currentOrderB) return currentOrderA - currentOrderB;

              // Access order_index directly from the question object (DBQuestion type)
              const questionOrderA = a.order_index ?? 0; // Use the order_index from the question itself
              const questionOrderB = b.order_index ?? 0; // Use the order_index from the question itself
              return questionOrderA - questionOrderB;
          });
      } else {
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

  // --- Authorization Check ---
  useEffect(() => {
    if (pirDetails && currentCompany && !isLoadingPir) {
      const expectedSupplierId = pirDetails.pir.supplier_company_id;
      if (currentCompany.id !== expectedSupplierId) {
        toast.error("Unauthorized: You are not the designated supplier for this request.");
        navigate('/unauthorized', { replace: true });
      }
    }
    // Run check when PIR details or current company context changes after initial load
  }, [pirDetails, currentCompany, isLoadingPir, navigate]);
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
  // Group questions first by their parent section ID (top-level sections), then by their own section ID (subsections)
  const questionsGrouped = sheetQuestions.reduce(
    (acc, question) => {
      // Determine the parent section ID. If no parent, use the section's own ID as the key for top-level grouping.
      const parentSectionId = question.question_sections?.parent_section?.id ?? question.question_sections?.id ?? "root";
      const currentSectionId = question.section_id ?? "unsectioned"; // Use the direct section_id from the question

      if (!acc[parentSectionId]) {
        acc[parentSectionId] = {};
      }
      if (!acc[parentSectionId][currentSectionId]) {
        acc[parentSectionId][currentSectionId] = [];
      }
      acc[parentSectionId][currentSectionId].push(question);
      return acc;
    // Adjust the type based on the updated PirDetails['questions'] type
    }, {} as Record<string, Record<string, PirDetails['questions']>>);

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
      toast.error(`Failed to save answer for question ID ${variables.questionId}: ${error.message}`);
    },
  });

  // Define input type for the submit mutation
  type SubmitPirInput = {
    pirId: string;
    customerEmail?: string | null;
    supplierName?: string | null;
    productName?: string | null;
    // Add any other data needed for notification
  };

  const submitPirMutation = useMutation({
    mutationFn: async (input: SubmitPirInput) => { // Use the input type
      if (!input.pirId) throw new Error("PIR ID is missing");

      const updates = {
        status: 'submitted' as PIRStatus, // Cast to the enum type
        // removed submitted_at as the column doesn't exist
      };

      console.log('[Submit PIR Mutation] Attempting update with:', updates);
      const { error } = await supabase
        .from('pir_requests')
        .update(updates)
        .eq('id', input.pirId); // Use pirId from input
      console.log('[Submit PIR Mutation] Update result error:', error);

      if (error) throw error;
      return { ...input }; // Return input data for onSuccess
    },
    onSuccess: async (data) => { // Make async
      toast.success(`PIR Response submitted successfully!`);

      // --- Add Logging ---
      console.log(`[Submit PIR Success] PIR ID: ${data.pirId}, Invalidating query key: ['incomingPirs', ${currentCompany?.id}]`);
      // --- End Logging ---

      queryClient.invalidateQueries({ queryKey: ['pirDetails', data.pirId] }); // Invalidate details for this form
      queryClient.invalidateQueries({ queryKey: ['incomingPirs', currentCompany?.id] }); // Invalidate the specific list query for the current company

      // --- Send Email Notification to Customer via Edge Function ---
      try {
        // Fetch the updated PIR record to pass to the function
        // Ensure all fields needed by the edge function's getCompanyDetails/getProductName are selected
        const { data: updatedPirRecord, error: fetchError } = await supabase
            .from('pir_requests')
            .select('*, products(name)') // Select needed fields + product name
            .eq('id', data.pirId)
            .single();

        if (fetchError || !updatedPirRecord) {
            throw new Error(`Failed to fetch updated PIR record: ${fetchError?.message || 'Not found'}`);
        }

        // Construct the payload expected by the 'send-email' function
        const payload = {
            type: 'PIR_STATUS_UPDATE',
            record: updatedPirRecord, // Pass the full updated record
            // old_record might be useful here if the function handles transitions
        };

        // Invoke the Edge Function
        const { error: functionError } = await supabase.functions.invoke(
            'send-email', // Use the correct function name
            { body: payload }
        );

        if (functionError) {
            throw functionError;
        }
        // Success toast can be generic or removed if function handles it
        toast.info(`Notification process initiated for PIR ${data.pirId}.`);

      } catch (notificationError: any) {
        console.error("Failed to send PIR submission notification:", notificationError);
        toast.error(`Response submitted, but failed to send notification: ${notificationError.message}`);
      }
      // --- End Send Email Notification ---

      navigate('/our-products'); // Navigate back to the supplier's product/request list page
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit PIR: ${error.message}`);
    },
  });


  // --- Event Handlers ---
  // Updated handler to use the submit mutation
  const handleSubmit = () => {
    // Optional: Add validation here
    if (!pirDetails) {
      toast.error("PIR details not loaded yet.");
      return;
    }
    submitPirMutation.mutate({
      pirId: pirId!,
      customerEmail: pirDetails.customer?.contact_email,
      supplierName: pirDetails.supplier?.name,
      productName: pirDetails.product?.name,
    });
  };
  const handleSaveAsDraft = () => { toast.info("Save as Draft functionality not fully implemented."); };
  // Updated handler to use the mutation
  const handleAnswerUpdate = (questionId: string, value: any) => {
    updateAnswerMutation.mutate({ questionId, value });
  };
  const handleAddComment = (answerId: string, text: string) => { toast.info(`Adding comment to A:${answerId} - Not implemented.`); };
  // --- End Event Handlers ---


  const toggleSection = (sectionId: string) => { setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] })); };

  // Helper functions
  // Helper to get the name of a top-level section (group key)
  const getParentSectionName = (parentSectionId: string): string => {
      if (parentSectionId === "root" || parentSectionId === "unsectioned") return "General Questions";
      // Find a question belonging to this parent group to get the parent section's details
      // This assumes parentSectionId is the ID of the actual parent section OR the ID of the top-level section itself
      const questionInGroup = sheetQuestions.find(q => (q.question_sections?.parent_section?.id ?? q.question_sections?.id) === parentSectionId);
      const sectionInfo = questionInGroup?.question_sections?.parent_section ?? questionInGroup?.question_sections; // Get parent if exists, else the section itself
      return sectionInfo ? `${sectionInfo.order_index ?? '?'}. ${sectionInfo.name}` : "Unknown Section";
  };

  // Helper to get the name of a subsection (the question's direct section)
  const getCurrentSectionName = (parentSectionId: string, currentSectionId: string): string => {
      if (currentSectionId === "unsectioned") return "General";
      // Find a question with this section_id to get its details
      const questionInSection = sheetQuestions.find(q => q.section_id === currentSectionId);
      const currentSection = questionInSection?.question_sections;
      const parentSection = currentSection?.parent_section; // Check if it actually has a parent in the data

      if (!currentSection) return "Unknown Subsection";

      // Format with hierarchical numbering if a parent exists
      if (parentSection && parentSection.id === parentSectionId) {
          // This is a true subsection
          return `${parentSection.order_index ?? '?'}.${currentSection.order_index ?? '?'} ${currentSection.name}`;
      } else {
          // This is likely a top-level section being rendered (parentSectionId matches currentSectionId or is 'root')
          // Only show its own index and name
          return `${currentSection.order_index ?? '?'}. ${currentSection.name}`;
      }
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

  const productName = pirDetails.product?.name ?? pirDetails.pir.suggested_product_name ?? 'Unknown Product';
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
        {/* Iterate through the grouped questions: Parent Section -> Current Section -> Questions */}
        {Object.entries(questionsGrouped).map(([parentSectionId, sections]) => (
          <Card key={parentSectionId}>
            {/* Use parentSectionId for the collapsible state key */}
            <Collapsible open={expandedSections[parentSectionId] !== false} onOpenChange={() => toggleSection(parentSectionId)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    {/* Display the name of the parent section group */}
                    <span>{getParentSectionName(parentSectionId)}</span>
                    <div className="flex items-center text-sm font-normal text-muted-foreground">
                      {/* Calculate total questions in this parent group */}
                      <span className="mr-2">{Object.values(sections).flat().length} questions</span>
                      {expandedSections[parentSectionId] === false ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-8 pt-0">
                  {/* Iterate through the actual sections (subsections) within the parent group */}
                  {Object.entries(sections).map(([currentSectionId, questions]) => (
                    <div key={currentSectionId} className="space-y-6">
                      {/* Display the name of the current section (subsection) */}
                      <h3 className="font-medium text-lg border-b pb-2">{getCurrentSectionName(parentSectionId, currentSectionId)}</h3>
                      {questions.map((question, index) => {
                        const answer: SupplierResponse | undefined = answersMap[question.id];

                        // Calculate hierarchical number
                        const parentOrder = question.question_sections?.parent_section?.order_index;
                        const currentOrder = question.question_sections?.order_index;
                        const questionOrder = index + 1; // 1-based index within the subsection

                        let hierarchicalNumber = '';
                        if (parentOrder !== null && parentOrder !== undefined) {
                          // Use parentOrder + 1 and currentOrder + 1 if they are 0-based, otherwise use as is. Assuming they are 1-based from DB.
                          hierarchicalNumber = `${parentOrder}.${currentOrder ?? '?'}.${questionOrder}`;
                        } else if (currentOrder !== null && currentOrder !== undefined) {
                           // Use currentOrder + 1 if 0-based. Assuming 1-based.
                          hierarchicalNumber = `${currentOrder}.${questionOrder}`;
                        } else {
                          hierarchicalNumber = `${questionOrder}`; // Fallback if no section info
                        }

                        return (
                          <div key={question.id} className="border-t pt-6 first:border-t-0 first:pt-0">
                            <QuestionItem
                              // Pass the calculated number along with the question data
                              question={{ ...question, hierarchical_number: hierarchicalNumber }}
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
