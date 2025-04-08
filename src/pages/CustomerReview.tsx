import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReviewQuestionItem from "@/components/reviews/ReviewQuestionItem";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, Flag, ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";
// Import types from central location and generated types
import { Tag, Company, Subsection, Section, SupplierResponse, Flag as LocalFlagType, Question as LocalQuestionType } from "../types/index"; // Use relative path
import { PIRRequest, PIRStatus, PIRResponse as DBPIRResponse } from "@/types/pir";
import { Database } from "@/types/supabase";
type DBFlag = Database['public']['Tables']['response_flags']['Row'];
type DBQuestionType = Database['public']['Enums']['question_type'];
import TagBadge from "@/components/tags/TagBadge";
import TaskProgress from "@/components/ui/progress/TaskProgress";

// Type definition for DBQuestion used in this component
type DBQuestionForReview = {
  id: string;
  subsection_id: string | null;
  text: string;
  description: string | null;
  type: DBQuestionType;
  required: boolean | null;
  options: any | null;
  created_at: string | null;
  updated_at: string | null;
  tags?: Tag[];
  subsection?: Subsection & { section?: Section };
};
// End DBQuestion definition

// Type for the combined PIR data fetched by the query
interface PirDetailsForReview {
    pir: Database['public']['Tables']['pir_requests']['Row'];
    product: { id: string; name: string; } | null;
    supplier: Company | null;
    customer: Company | null;
    tags: Tag[];
    questions: DBQuestionForReview[];
    responses: (DBPIRResponse & { response_flags?: DBFlag[] })[];
}


// --- Reusable Submit Review Mutation Hook ---
type SubmitReviewInput = {
    pirId: string;
    userId: string; // Reviewer's ID
    userName: string; // Reviewer's name/email
    reviewStatuses: Record<string, "approved" | "flagged" | "pending">;
    reviewNotes: Record<string, string>;
    // Add context for notification
    supplierEmail?: string | null;
    customerName?: string | null;
    productName?: string | null;
    customerId?: string; // Added customerId for query invalidation
};
type SubmitReviewResult = { finalStatus: PIRStatus };

const useSubmitReviewMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<SubmitReviewResult, Error, SubmitReviewInput> => {
    return useMutation<SubmitReviewResult, Error, SubmitReviewInput>({
        mutationFn: async (input) => {
            const { pirId, userId, userName, reviewStatuses, reviewNotes } = input;
            let hasFlags = false;
            const flagInserts: Database['public']['Tables']['response_flags']['Insert'][] = [];

            for (const [responseId, status] of Object.entries(reviewStatuses)) {
                if (status === 'flagged') {
                    const note = reviewNotes[responseId];
                    if (note) {
                        hasFlags = true;
                        flagInserts.push({
                            response_id: responseId,
                            description: note, // Use description column for comment
                            created_by: userId,
                            status: 'open'
                        });
                    } else { }
                } else if (status === 'approved') {
                    // TODO: Clear/resolve flags for this response
                    // Example: await supabase.from('response_flags').update({ status: 'resolved', resolved_by: userId, resolved_at: new Date().toISOString() }).eq('response_id', responseId).eq('status', 'open');
                }
            }

            if (flagInserts.length > 0) {
                const { error: flagError } = await supabase.from('response_flags').insert(flagInserts);
                if (flagError) throw new Error(`Failed to save flags: ${flagError.message}`);
            }

            const finalStatus: PIRStatus = hasFlags ? 'flagged' : 'approved'; // Use 'flagged' status

            const { error: pirUpdateError } = await supabase
                .from('pir_requests')
                .update({ status: finalStatus, updated_at: new Date().toISOString() })
                .eq('id', pirId);
            if (pirUpdateError) throw new Error(`Failed to update PIR status: ${pirUpdateError.message}`);

            return { finalStatus };
        },
        onSuccess: async (data, variables) => { // Make async
            queryClient.invalidateQueries({ queryKey: ['pirDetailsForReview', variables.pirId] });
            // Invalidate the specific query key used by ProductSheets
            if (variables.customerId) {
                queryClient.invalidateQueries({ queryKey: ['pirRequestsWithDetails', variables.customerId] });
            } else {
                // Fallback or broader invalidation if customerId isn't passed (less ideal)
                queryClient.invalidateQueries({ queryKey: ['pirRequestsWithDetails'] });
                console.warn("customerId not provided for precise query invalidation in useSubmitReviewMutation");
            }
            toast.success(`Review submitted. Final status: ${data.finalStatus}`);

            // --- Send Email Notification to Supplier via Edge Function ---
            try {
                // Fetch the updated PIR record to pass to the function
                const { data: updatedPirRecord, error: fetchError } = await supabase
                    .from('pir_requests')
                    .select('*, products(name)') // Select needed fields
                    .eq('id', variables.pirId)
                    .single();

                if (fetchError || !updatedPirRecord) {
                    throw new Error(`Failed to fetch updated PIR record for notification: ${fetchError?.message || 'Not found'}`);
                }

                // Construct the payload expected by the 'send-email' function
                // Pass the *updated* record which now has status 'approved' or 'flagged'
                const payload = {
                    type: 'PIR_STATUS_UPDATE',
                    record: updatedPirRecord,
                    // old_record might be useful here if the function handles transitions
                };

                // Invoke the Edge Function
                const { error: functionError } = await supabase.functions.invoke(
                    'send-email',
                    { body: payload }
                );

                if (functionError) {
                    throw functionError;
                }
                toast.info(`Notification process initiated for PIR ${variables.pirId}.`);

            } catch (notificationError: any) {
                console.error("Failed to send PIR review notification:", notificationError);
                toast.error(`Review submitted, but failed to send notification: ${notificationError.message}`);
            }
            // --- End Send Email Notification ---
        },
        onError: (error) => {
            toast.error(`Failed to submit review: ${error.message}`);
        },
    });
};
// --- End Submit Review Mutation Hook ---


const CustomerReview = () => {
  const { id: pirId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("flagged");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<string, "approved" | "flagged" | "pending">>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // --- Fetch PIR Details Query ---
  const fetchPirDetailsForReview = async (id: string): Promise<PirDetailsForReview> => {
      // 1. Fetch PIR Request and related companies/product
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

      // 2. Fetch Tags associated with the PIR
      const { data: tagLinks, error: tagLinksError } = await supabase
          .from('pir_tags')
          .select('tag:tags(*)')
          .eq('pir_id', id);
      if (tagLinksError) throw new Error(`Failed to fetch PIR tags: ${tagLinksError.message}`);
      const tags = (tagLinks?.map(link => link.tag).filter(Boolean).flat() || []) as Tag[];

      // 3. Fetch Questions based on Tags
      const tagIds = tags.map(t => t.id);
      let questions: DBQuestionForReview[] = [];
      if (tagIds.length > 0) {
          const { data: questionLinks, error: qLinkError } = await supabase
              .from('question_tags') // Query the join table
              .select(`
                  question:questions (
                      *,
                      subsection:subsections(*, section:sections(*))
                  )
              `) // Select the related question with its structure
              .in('tag_id', tagIds); // Filter by the PIR's tags

          if (qLinkError) throw new Error(`Failed to fetch questions for tags: ${qLinkError.message}`);

          // Deduplicate questions and structure them
          const questionMap = new Map<string, DBQuestionForReview>();
          (questionLinks || []).forEach(link => {
              const questionData = link.question as any; // Access the aliased 'question'
              if (questionData && !questionMap.has(questionData.id)) {
                  const subsection = questionData.subsection as any;
                  const section = subsection?.section as any;
                  const structuredQuestion: DBQuestionForReview = {
                      id: questionData.id,
                      subsection_id: questionData.subsection_id,
                      text: questionData.text,
                      description: questionData.description,
                      type: questionData.type as DBQuestionType,
                      required: questionData.required,
                      options: questionData.options,
                      created_at: questionData.created_at,
                      updated_at: questionData.updated_at,
                      tags: [], // Placeholder
                      // Map section/subsection data, including order property
                      subsection: subsection ? { ...subsection, order: subsection.order_index, section: section ? { ...section, order: section.order_index } : undefined } : undefined
                  };
                  questionMap.set(questionData.id, structuredQuestion);
              }
          });
          questions = Array.from(questionMap.values());
          questions.sort((a, b) => {
              const sectionOrderA = a.subsection?.section?.order || 0;
              const sectionOrderB = b.subsection?.section?.order || 0;
              if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;
              const subsectionOrderA = a.subsection?.order || 0;
              const subsectionOrderB = b.subsection?.order || 0;
              return subsectionOrderA - subsectionOrderB;
          });
      }

      // 4. Fetch Responses with Flags
      const { data: responsesData, error: responsesError } = await supabase
          .from('pir_responses')
          .select('*, response_flags(*)') // Fetch nested flags
          .eq('pir_id', id);
      if (responsesError) throw new Error(`Failed to fetch responses: ${responsesError.message}`);

      const safePirData = pirData as Database['public']['Tables']['pir_requests']['Row'];

      return {
          pir: safePirData,
          product: pirData.product as any,
          supplier: pirData.supplier as Company | null,
          customer: pirData.customer as Company | null,
          tags: tags,
          questions: questions,
          responses: (responsesData || []) as (DBPIRResponse & { response_flags?: DBFlag[] })[],
      };
  };

  const {
      data: pirDetails,
      isLoading: isLoadingPir,
      error: errorPir,
  } = useQuery<PirDetailsForReview, Error>({
      queryKey: ['pirDetailsForReview', pirId],
      queryFn: () => fetchPirDetailsForReview(pirId!),
      enabled: !!pirId,
  });
  // --- End Fetch PIR Details Query ---

  // Submit Review Mutation
  const submitReviewMutation = useSubmitReviewMutation(queryClient);

  // Initialize review state
  useEffect(() => {
    if (pirDetails?.responses) {
      const initialStatus: Record<string, "approved" | "flagged" | "pending"> = {};
      const initialNotes: Record<string, string> = {};
      pirDetails.responses.forEach(response => {
        if (response.response_flags && response.response_flags.length > 0) {
          initialStatus[response.id] = "flagged";
          initialNotes[response.id] = response.response_flags[response.response_flags.length - 1]?.description || "";
        } else {
          initialStatus[response.id] = "pending";
          initialNotes[response.id] = "";
        }
      });
      setReviewStatus(initialStatus);
      setReviewNotes(initialNotes);
    }
  }, [pirDetails?.responses]);

  // Initialize expanded sections
  useEffect(() => {
      if (pirDetails?.questions && pirDetails.questions.length > 0) {
          const initialExpanded: Record<string, boolean> = {};
          pirDetails.questions.forEach(q => {
              const sectionId = q.subsection?.section?.id || "unsectioned";
              initialExpanded[sectionId] = true;
          });
          setExpandedSections(initialExpanded);
      }
  }, [pirDetails?.questions]);


  // --- Derived State ---
  const productSheet = pirDetails?.pir;
  const supplier = pirDetails?.supplier;
  const sheetQuestions = pirDetails?.questions ?? [];
  const sheetTags = pirDetails?.tags ?? [];
  const sheetResponses = pirDetails?.responses ?? [];
  const isPreviouslyReviewed = productSheet?.status === "flagged";

  // Grouping logic
  const questionsBySections = sheetQuestions.reduce(
    (acc, question) => {
      const sectionId = question.subsection?.section?.id || "unsectioned";
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(question);
      return acc;
    }, {} as Record<string, DBQuestionForReview[]>);

  const questionsBySubsection = Object.entries(questionsBySections).reduce(
    (acc, [sectionId, sectionQuestions]) => {
      acc[sectionId] = sectionQuestions.reduce(
        (subAcc, question) => {
          const subsectionId = question.subsection_id || "unsubsectioned";
          if (!subAcc[subsectionId]) subAcc[subsectionId] = [];
          subAcc[subsectionId].push(question);
          return subAcc;
        }, {} as Record<string, DBQuestionForReview[]>);
      return acc;
    }, {} as Record<string, Record<string, DBQuestionForReview[]>>);

  // Map DBPIRResponse to SupplierResponse for QuestionItem component
  const answersMap = sheetResponses.reduce((acc, response) => {
    acc[response.question_id!] = {
        id: response.id,
        questionId: response.question_id!,
        value: response.answer as any,
        comments: [], // Map to empty array
        // Correctly map DBFlag to LocalFlagType
        flags: (response.response_flags || []).map(flag => ({
            id: flag.id,
            answerId: flag.response_id || '', // Map response_id to answerId
            comment: flag.description || '', // Map description to comment
            createdBy: flag.created_by || '', // Map created_by
            createdByName: '', // Not available directly
            createdAt: flag.created_at ? new Date(flag.created_at) : new Date(), // Convert string to Date
            // Ensure all required fields from LocalFlagType are present
            response_id: flag.response_id, // Add missing fields from LocalFlagType
            created_by: flag.created_by,
            created_at: flag.created_at || new Date().toISOString(), // Use string for LocalFlagType
        })) as LocalFlagType[],
    } as SupplierResponse & { flags?: LocalFlagType[] };
    return acc;
  }, {} as Record<string, SupplierResponse & { flags?: LocalFlagType[] }>);

  // Filter questions - Updated to handle missing answers
  const getFilteredQuestions = (sectionQuestions: DBQuestionForReview[]): DBQuestionForReview[] => {
    return sectionQuestions.filter(q => {
        const answer = answersMap[q.id];
        const status = reviewStatus[answer?.id] || "pending"; // Default to pending if no answer/status yet
        const hasFlags = answer?.flags && answer.flags.length > 0;

        if (activeTab === "all") return true; // Always show in 'all' tab

        // If no answer exists yet, it's considered pending
        if (!answer) {
            return activeTab === "pending";
        }

        // If answer exists, apply tab-specific logic
        if (activeTab === "flagged") return status === "flagged" || (isPreviouslyReviewed && hasFlags);
        if (activeTab === "approved") return status === "approved";
        if (activeTab === "pending") return status === "pending" && !(isPreviouslyReviewed && hasFlags);

        return false; // Should not be reached if tabs cover all cases
    });
  };

  // Calculate counts
  const flaggedCount = sheetResponses.filter(r => (reviewStatus[r.id] === 'flagged') || (isPreviouslyReviewed && r.response_flags && r.response_flags.length > 0)).length;
  const approvedCount = sheetResponses.filter(r => reviewStatus[r.id] === 'approved').length;
  const pendingCount = sheetResponses.filter(r => reviewStatus[r.id] === 'pending' && !(isPreviouslyReviewed && r.response_flags && r.response_flags.length > 0)).length;
  const totalAnsweredQuestions = sheetResponses.length;

  // Set default tab
  useEffect(() => {
    if (isPreviouslyReviewed && flaggedCount > 0) setActiveTab("flagged");
    else setActiveTab("all");
  }, [isPreviouslyReviewed, flaggedCount]);

  // --- Event Handlers ---
  const toggleSection = (sectionId: string) => { setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] })); };
  const handleApprove = (responseId: string) => {
    setReviewStatus(prev => ({ ...prev, [responseId]: "approved" }));
    setReviewNotes(prev => ({ ...prev, [responseId]: "" }));
    toast.success("Answer marked as approved");
   };
  const handleFlag = (responseId: string, note: string) => {
    if (!note?.trim()) { toast.error("Please add a note explaining the issue."); return; }
    setReviewStatus(prev => ({ ...prev, [responseId]: "flagged" }));
    setReviewNotes(prev => ({ ...prev, [responseId]: note }));
    toast.info("Answer marked as flagged");
   };
  const handleUpdateNote = (responseId: string, note: string) => { setReviewNotes(prev => ({ ...prev, [responseId]: note })); };
  const handleSubmitReview = () => {
    if (!user) { toast.error("You must be logged in"); return; }
    if (!pirId) { toast.error("PIR ID missing"); return; }

    const pendingAnswers = sheetResponses.filter(r => reviewStatus[r.id] === 'pending');
    if (pendingAnswers.length > 0 && !isPreviouslyReviewed) {
        toast.error(`Please review all ${pendingAnswers.length} pending answers.`); return;
    }
    const flaggedWithoutNotes = Object.entries(reviewStatus).filter(([id, status]) => status === 'flagged' && !reviewNotes[id]?.trim()).length;
    if (flaggedWithoutNotes > 0) {
        toast.error(`Please add notes to all ${flaggedWithoutNotes} flagged answers.`); return;
    }

    if (!pirDetails) {
      toast.error("PIR details not loaded yet.");
      return;
    }
    submitReviewMutation.mutate({
        pirId: pirId!,
        userId: user.id,
        userName: user.email || 'Reviewer',
        reviewStatuses: reviewStatus,
        reviewNotes,
        // Pass context for notification
        supplierEmail: pirDetails.supplier?.contact_email,
        customerName: pirDetails.customer?.name,
        productName: pirDetails.product?.name,
        customerId: pirDetails.customer?.id, // Pass customerId
   }, { onSuccess: () => { navigate("/product-sheets"); } }); // Keep existing navigation on success
  };
  // --- End Event Handlers ---

  // Helper functions
  const getSectionName = (sectionId: string): string => {
      if (sectionId === "unsectioned") return "General Questions";
      const questionInSection = sheetQuestions.find(q => q.subsection?.section?.id === sectionId);
      const section = questionInSection?.subsection?.section;
      return section ? `${section.order || '?'}. ${section.name}` : "Unknown Section";
  };
  const getSubsectionName = (sectionId: string, subsectionId: string): string => {
      if (subsectionId === "unsubsectioned") return "General";
      const questionInSubsection = sheetQuestions.find(q => q.subsection_id === subsectionId);
      const subsection = questionInSubsection?.subsection;
      const section = subsection?.section;
      if (!section || !subsection) return "Unknown Subsection";
      return `${section.order || '?'}.${subsection.order || '?'} ${subsection.name}`;
  };
  const getDisplayStatus = () => { /* ... */ };
  const getStatusColorClass = () => { /* ... */ };
  // --- End Helper Functions ---


  // --- Render Logic ---
  if (isLoadingPir) { return <div className="p-12 text-center">Loading PIR details...</div>; }
  if (errorPir) { return <div className="p-12 text-center text-red-500">Error loading PIR: {errorPir.message}</div>; }
  if (!pirDetails || !productSheet) { return ( <div className="py-12 text-center"> <h2 className="text-2xl font-bold mb-4">PIR not found</h2> <Button onClick={() => navigate(-1)}>Go Back</Button> </div> ); }

  const productName = pirDetails.product?.name ?? 'Unknown Product';
  const pageTitle = productSheet.title || `Review - ${productName}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={pageTitle}
        subtitle={isPreviouslyReviewed ? "Reviewing flagged issues" : "Initial review"}
        actions={( // Fixed JSX expression
          <Button className="bg-brand hover:bg-brand/90" onClick={handleSubmitReview} disabled={submitReviewMutation.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
          </Button>
        )}
      />

      <Card>
        {/* ... Card Header & Content ... */}
      </Card>

      <Tabs defaultValue={isPreviouslyReviewed ? "flagged" : "all"} value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
           {/* ... Tabs Triggers ... */}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {Object.entries(questionsBySections).map(([sectionId, sectionQuestions]) => {
            const filteredSectionQuestions = getFilteredQuestions(sectionQuestions);
            if (filteredSectionQuestions.length === 0) return null;
            const sectionName = getSectionName(sectionId);

            return (
              <Card key={sectionId}>
                <Collapsible open={expandedSections[sectionId] !== false} onOpenChange={() => toggleSection(sectionId)}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50">
                    <h3 className="text-lg font-semibold">{sectionName}</h3>
                    {expandedSections[sectionId] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Separator />
                    {filteredSectionQuestions.map((question, index) => {
                      const answer = answersMap[question.id];
                      // Removed check: if (!answer) return null; We need to render even without an answer.
                      const status = reviewStatus[answer.id] || "pending";
                      // Map DBQuestionForReview to LocalQuestionType for the component prop
                      const questionForComponent: LocalQuestionType = {
                          id: question.id,
                          text: question.text,
                          // title: question.text, // Removed title
                          description: question.description,
                          // Cast DB enum type directly to local type
                          type: question.type as LocalQuestionType['type'],
                          required: question.required ?? false,
                          // is_required: question.required ?? false, // Removed is_required
                          options: question.options,
                          tags: question.tags || [],
                          created_at: question.created_at || '',
                          updated_at: question.updated_at || '',
                          subsection_id: question.subsection_id || '', // Use correct snake_case property name
                          // subsectionId: question.subsection_id || '', // Removed incorrect camelCase
                          // category_id: question.subsection_id || '', // Removed category_id if not in LocalQuestionType
                          // validation_rules: null, // Removed validation_rules
                          // created_by: '', // Removed created_by
                          // sectionId: question.subsection?.section?.id || '', // Removed sectionId as it's not in LocalQuestionType
                      };
                      // DEBUG: Log props being passed to ReviewQuestionItem
                      console.log(`CustomerReview: Rendering ReviewQuestionItem for Q:${question.id}`, { answerExists: !!answer, status, note: reviewNotes[answer?.id] || "" });
                      return (
                        <div key={question.id}>
                          <ReviewQuestionItem
                            question={questionForComponent} // Pass mapped question
                            answer={answer}
                            status={status}
                            note={reviewNotes[answer.id] || ""}
                            onApprove={() => { if (answer) handleApprove(answer.id); }}
                            onFlag={(note) => { if (answer) handleFlag(answer.id, note); }}
                            onUpdateNote={(note) => { if (answer) handleUpdateNote(answer.id, note); }}
                            // isPreviouslyFlagged is now handled internally by ReviewQuestionItem
                          />
                          {index < filteredSectionQuestions.length - 1 && <Separator />}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
          {/* ... No questions message ... */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerReview;
