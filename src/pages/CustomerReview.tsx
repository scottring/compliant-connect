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
import { Tag } from "@/types"; // Assuming Tag is correctly exported from index
// Import needed types from pir.ts
import { PIRRequest, PIRStatus, PIRResponse as DBPIRResponse, Question as LocalQuestionType, FlagType as LocalFlagType } from "@/types/pir"; // Removed SupplierResponse import
import { Database } from "@/types/supabase";
type DBFlag = Database['public']['Tables']['response_flags']['Row'];
type DBQuestionType = Database['public']['Enums']['question_type'];
import TagBadge from "@/components/tags/TagBadge";
import TaskProgress from "@/components/ui/progress/TaskProgress";

// Define types locally based on Supabase schema
type Company = Database['public']['Tables']['companies']['Row'];
type Subsection = Database['public']['Tables']['subsections']['Row'];
type Section = Database['public']['Tables']['sections']['Row'];

// Type definition for DBQuestion used in this component (align with LocalQuestionType if possible)
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
// This hook handles flagging and setting status to approved/flagged
// We might need separate mutations for Accept / Request Revision actions
type SubmitReviewInput = {
    pirId: string;
    userId: string;
    userName: string;
    reviewStatuses: Record<string, "approved" | "flagged" | "pending">;
    reviewNotes: Record<string, string>;
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
                    } else { console.warn(`Response ${responseId} flagged without note.`); }
                } else if (status === 'approved') {
                    // TODO: Clear/resolve flags for this response
                    // Example: await supabase.from('response_flags').update({ status: 'resolved', resolved_by: userId, resolved_at: new Date().toISOString() }).eq('response_id', responseId).eq('status', 'open');
                }
            }

            if (flagInserts.length > 0) {
                const { error: flagError } = await supabase.from('response_flags').insert(flagInserts);
                if (flagError) throw new Error(`Failed to save flags: ${flagError.message}`);
            }

            // Determine final status based on flags
            const finalStatus: PIRStatus = hasFlags ? 'flagged' : 'approved'; // Use 'flagged' status if any flags exist

            const { error: pirUpdateError } = await supabase
                .from('pir_requests')
                .update({ status: finalStatus, updated_at: new Date().toISOString() })
                .eq('id', pirId);
            if (pirUpdateError) throw new Error(`Failed to update PIR status: ${pirUpdateError.message}`);

            return { finalStatus };
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pirDetailsForReview', variables.pirId] });
            queryClient.invalidateQueries({ queryKey: ['pirRequests'] }); // Invalidate general list too
            toast.success(`Review submitted. Final status: ${data.finalStatus}`);
        },
        onError: (error) => {
            console.error("Error submitting review:", error);
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

  const [activeTab, setActiveTab] = useState("all"); // Default to all
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
                      subsection: subsection ? { ...subsection, order_index: subsection.order_index, section: section ? { ...section, order_index: section.order_index } : undefined } : undefined
                  };
                  questionMap.set(questionData.id, structuredQuestion);
              }
          });
          questions = Array.from(questionMap.values());
          questions.sort((a, b) => {
              const sectionOrderA = a.subsection?.section?.order_index || 0;
              const sectionOrderB = b.subsection?.section?.order_index || 0;
              if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;
              const subsectionOrderA = a.subsection?.order_index || 0;
              const subsectionOrderB = b.subsection?.order_index || 0;
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

  // Submit Review Mutation (Handles flagging)
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
          // Default to pending
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
  // Determine if previously reviewed based on status
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

  // Map DBPIRResponse for ReviewQuestionItem component
  // Define a type for the structure ReviewQuestionItem expects for 'answer'
  type AnswerForReviewItem = {
      id: string;
      value: any;
      flags?: LocalFlagType[];
      // Add other fields if ReviewQuestionItem needs them
  };

  const answersMap = sheetResponses.reduce((acc, response) => {
    if(response.question_id) {
        acc[response.question_id] = {
            id: response.id,
            value: response.answer as any,
            // Correctly map DBFlag to LocalFlagType, adding missing properties
            flags: (response.response_flags || []).map(flag => ({
                id: flag.id,
                response_id: flag.response_id,
                comment: flag.description || '', // Map description to comment
                created_by: flag.created_by || '',
                created_at: flag.created_at || new Date().toISOString(),
                status: flag.status || 'open',
                // Add missing properties required by LocalFlagType with default values
                description: flag.description || '', // Use description for comment here too? Or set null?
                resolved_at: null, // Not available in DBFlag
                resolved_by: null, // Not available in DBFlag
                updated_at: flag.updated_at || new Date().toISOString(), // Use updated_at if available, else default
            })) as LocalFlagType[],
        } as AnswerForReviewItem; // Use the defined type
    }
    return acc;
  }, {} as Record<string, AnswerForReviewItem>);

  // Filter questions
  const getFilteredQuestions = (sectionQuestions: DBQuestionForReview[]): DBQuestionForReview[] => {
    return sectionQuestions.filter(q => {
        const answer = answersMap[q.id];
        if (!answer) return false; // Only show questions that have been answered
        const status = reviewStatus[answer.id];
        const hasFlags = answer.flags && answer.flags.length > 0;

        if (activeTab === "all") return true;
        if (activeTab === "flagged") return status === "flagged" || (isPreviouslyReviewed && hasFlags);
        if (activeTab === "approved") return status === "approved";
        if (activeTab === "pending") return status === "pending" && !(isPreviouslyReviewed && hasFlags);
        return false;
    });
  };

  // Calculate counts
  const flaggedCount = sheetResponses.filter(r => (reviewStatus[r.id] === 'flagged') || (isPreviouslyReviewed && r.response_flags && r.response_flags.length > 0)).length;
  const approvedCount = sheetResponses.filter(r => reviewStatus[r.id] === 'approved').length;
  const pendingCount = sheetResponses.filter(r => reviewStatus[r.id] === 'pending' && !(isPreviouslyReviewed && r.response_flags && r.response_flags.length > 0)).length;
  const totalAnsweredQuestions = sheetResponses.length;

  // Set default tab
  useEffect(() => {
    // Default to 'all' or 'flagged' if previously reviewed with flags
    if (isPreviouslyReviewed && flaggedCount > 0) setActiveTab("flagged");
    else setActiveTab("all");
  }, [isPreviouslyReviewed, flaggedCount]);

  // --- Event Handlers ---
  const toggleSection = (sectionId: string) => { setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] })); };
  const handleApprove = (responseId: string) => {
    setReviewStatus(prev => ({ ...prev, [responseId]: "approved" }));
    setReviewNotes(prev => ({ ...prev, [responseId]: "" })); // Clear note on approve
    toast.success("Answer marked as approved");
   };
  const handleFlag = (responseId: string, note: string) => {
    if (!note?.trim()) { toast.error("Please add a note explaining the issue."); return; }
    setReviewStatus(prev => ({ ...prev, [responseId]: "flagged" }));
    setReviewNotes(prev => ({ ...prev, [responseId]: note }));
    toast.info("Answer marked as flagged");
   };
  const handleUpdateNote = (responseId: string, note: string) => { setReviewNotes(prev => ({ ...prev, [responseId]: note })); };

  // Mutation to update PIR status for Accept/Request Revision
  const updatePIRStatusMutation = useMutation({
      mutationFn: async (newStatus: PIRStatus) => {
          if (!pirId) throw new Error("Missing PIR ID");
          const { error } = await supabase
              .from('pir_requests')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', pirId);
          if (error) throw error;
          return newStatus;
      },
      onSuccess: (newStatus) => {
          queryClient.invalidateQueries({ queryKey: ['pirDetailsForReview', pirId] });
          queryClient.invalidateQueries({ queryKey: ['pirRequests'] });
          if (newStatus === 'accepted') {
              toast.success("PIR Accepted!");
              navigate('/product-sheets'); // Go back to list after accepting
          } else if (newStatus === 'pending_supplier') {
              toast.info("Revision requested. Supplier notified.");
              // Optionally navigate or stay on page? Stay for now.
          }
      },
      onError: (error: any) => {
          toast.error(`Failed to update status: ${error.message}`);
      }
  });

  const handleRequestRevision = () => {
      console.log("Requesting Revision...");
      // TODO: Check if there are actually flags/notes before allowing revision?
      // For now, directly update status
      updatePIRStatusMutation.mutate('pending_supplier');
  };

  const handleAccept = () => {
      console.log("Accepting Response...");
      // TODO: Add confirmation dialog? Check if all items are approved?
      updatePIRStatusMutation.mutate('accepted');
  };
  // --- End Event Handlers ---

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
  const getDisplayStatus = () => { /* Placeholder - Add logic if needed */ return productSheet?.status || ''; };
  const getStatusColorClass = () => { /* Placeholder - Add logic if needed */ return 'bg-gray-100 text-gray-800'; };
  // --- End Helper Functions ---


  // --- Render Logic ---
  if (isLoadingPir) { return <div className="p-12 text-center">Loading PIR details...</div>; }
  if (errorPir) { return <div className="p-12 text-center text-red-500">Error loading PIR: {errorPir.message}</div>; }
  if (!pirDetails || !productSheet) { return ( <div className="py-12 text-center"> <h2 className="text-2xl font-bold mb-4">PIR not found</h2> <Button onClick={() => navigate(-1)}>Go Back</Button> </div> ); }

  const productName = pirDetails.product?.name ?? 'Unknown Product';
  const pageTitle = productSheet.title || `Review - ${productName}`;

  // Determine if Accept/Revision buttons should be disabled (e.g., if already accepted/rejected)
  const isFinalState = productSheet?.status === 'accepted' || productSheet?.status === 'rejected';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={pageTitle}
        subtitle={isPreviouslyReviewed ? "Reviewing flagged issues" : "Initial review"}
        actions={(
            <div className="flex gap-2">
              {/* Conditionally show Request Revision only if not already accepted/rejected? */}
              {!isFinalState && (
                  <Button
                    variant="destructive"
                    onClick={handleRequestRevision}
                    disabled={updatePIRStatusMutation.isPending}
                  >
                    Request Revision
                  </Button>
              )}
               {/* Conditionally show Accept only if not already accepted/rejected? */}
              {!isFinalState && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleAccept}
                    disabled={updatePIRStatusMutation.isPending}
                  >
                    Accept Response
                  </Button>
              )}
               {/* Remove the generic submit button if Accept/Revision handles the final state change */}
               {/* <Button className="bg-brand hover:bg-brand/90" onClick={handleSubmitReview} disabled={submitReviewMutation.isPending}>
                 <Send className="mr-2 h-4 w-4" />
                 {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
               </Button> */}
            </div>
        )}
      />

      <Card>
        {/* TODO: Add Card Header & Content similar to SupplierResponseForm if needed */}
         <CardHeader>
           <CardTitle>Review Details</CardTitle>
         </CardHeader>
         <CardContent>
            <p>Supplier: {supplier?.name || 'Unknown'}</p>
            {/* Add more details as needed */}
         </CardContent>
      </Card>

      <Tabs defaultValue={isPreviouslyReviewed ? "flagged" : "all"} value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
           <TabsTrigger value="all">All ({totalAnsweredQuestions})</TabsTrigger>
           <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
           <TabsTrigger value="flagged">Flagged ({flaggedCount})</TabsTrigger>
           <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
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
                      if (!answer) return null;
                      const status = reviewStatus[answer.id] || "pending";
                      // Map DBQuestionForReview to LocalQuestionType for the component prop
                      // Ensure LocalQuestionType is imported or defined correctly
                      const questionForComponent: LocalQuestionType = {
                          id: question.id,
                          text: question.text,
                          description: question.description,
                          // Cast DB enum type directly to local type if compatible
                          type: question.type as LocalQuestionType['type'],
                          required: question.required ?? false,
                          options: question.options,
                          tags: question.tags || [],
                          created_at: question.created_at || '',
                          updated_at: question.updated_at || '',
                          subsection_id: question.subsection_id || '', // Use correct snake_case property name
                          // Add any other fields required by LocalQuestionType, ensure they exist or provide defaults
                      };
                      return (
                        <div key={question.id}>
                          <ReviewQuestionItem
                            question={questionForComponent} // Pass mapped question
                            answer={answer}
                            status={status}
                            note={reviewNotes[answer.id] || ""}
                            onApprove={() => handleApprove(answer.id)}
                            onFlag={(note) => handleFlag(answer.id, note)}
                            onUpdateNote={(note) => handleUpdateNote(answer.id, note)}
                            isPreviouslyFlagged={answer.flags && answer.flags.length > 0}
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
          {/* Add message if no questions match the current filter */}
          {Object.values(questionsBySections).every(qs => getFilteredQuestions(qs).length === 0) && (
              <div className="text-center text-muted-foreground p-8">No questions match the current filter.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerReview;
