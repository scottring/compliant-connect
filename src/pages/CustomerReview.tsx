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
import { PIRRequest, PIRStatus, PIRResponse as DBPIRResponse, ResponseStatus, isValidPIRStatusTransition, isValidResponseStatusTransition } from "@/types/pir";
import { Database } from "@/types/supabase";
type DBFlag = Database['public']['Tables']['response_flags']['Row'];
type DBQuestionType = Database['public']['Enums']['question_type'];
import TagBadge from "@/components/tags/TagBadge";
import TaskProgress from "@/components/ui/progress/TaskProgress";

// Type definition for DBQuestion used in this component
type DBQuestionForReview = {
  id: string;
  // subsection_id: string | null; // Removed, info is in subsection object
  text: string;
  description: string | null;
  type: DBQuestionType;
  required: boolean | null;
  options: any | null;
  created_at: string | null;
  updated_at: string | null;
  tags?: Tag[];
  subsection?: Section; // Represents the joined question_sections record (acting as subsection)
  section?: Section;    // Represents the parent section, looked up from sectionMap
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
    productId?: string | null; // Add product ID for linking on approval
    reviewNotes: Record<string, string>;
    // Add context for notification
    supplierEmail?: string | null;
    customerName?: string | null;
    productName?: string | null;
};
type SubmitReviewResult = { finalStatus: PIRStatus };

const useSubmitReviewMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<SubmitReviewResult, Error, SubmitReviewInput> => {
    return useMutation<SubmitReviewResult, Error, SubmitReviewInput>({
        mutationFn: async (input) => {
            const { pirId, userId, userName, reviewStatuses, reviewNotes, productId } = input;
            let hasFlags = false;
            const flagInserts: Database['public']['Tables']['response_flags']['Insert'][] = [];

            // First update PIR status to 'in_review'
            const { data: currentPir, error: pirFetchError } = await supabase
                .from('pir_requests')
                .select('status')
                .eq('id', pirId)
                .single();

            if (pirFetchError) throw new Error(`Failed to fetch current PIR status: ${pirFetchError.message}`);
            
            const currentStatus = currentPir.status as PIRStatus;
            if (currentStatus !== 'submitted' && currentStatus !== 'flagged') {
                throw new Error(`Invalid PIR status for review: ${currentStatus}`);
            }

            // Update PIR to 'in_review' first
            if (currentStatus === 'submitted') {
                const { error: statusError } = await supabase
                    .from('pir_requests')
                    .update({ status: 'in_review' as PIRStatus })
                    .eq('id', pirId);
                if (statusError) throw new Error(`Failed to update PIR to in_review: ${statusError.message}`);
                
                // Send notification for in_review status
                try {
                    console.log("Fetching PIR record for in_review notification...");
                    const { data: updatedPirRecord, error: fetchError } = await supabase
                        .from('pir_requests')
                        .select(`
                            *,
                            products(name),
                            supplier:companies!pir_requests_supplier_company_id_fkey(name, contact_email),
                            customer:companies!pir_requests_customer_id_fkey(name, contact_email)
                        `)
                        .eq('id', pirId)
                        .single();

                    if (fetchError || !updatedPirRecord) {
                        console.error(`Failed to fetch PIR record for in_review notification: ${fetchError?.message || 'Not found'}`);
                    } else {
                        console.log("Sending notification for in_review status:", updatedPirRecord);
                        const { data, error: functionError } = await supabase.functions.invoke(
                            'send-email',
                            {
                                body: {
                                    type: 'PIR_STATUS_UPDATE',
                                    record: updatedPirRecord,
                                }
                            }
                        );

                        if (functionError) {
                            console.error("Error sending in_review notification:", functionError);
                        } else {
                            console.log("In-review notification sent successfully:", data);
                        }
                    }
                } catch (notificationError: any) {
                    console.error("Failed to send in_review notification:", notificationError);
                    console.error("Notification error details:", notificationError.stack || JSON.stringify(notificationError));
                    // Don't throw here, continue with the review process
                }
            }

            // Process each response
            for (const [responseId, status] of Object.entries(reviewStatuses)) {
                if (status === 'flagged') {
                    const note = reviewNotes[responseId];
                    if (note) {
                        hasFlags = true;
                        flagInserts.push({
                            response_id: responseId,
                            description: note,
                            created_by: userId,
                            status: 'open'
                        });
                    }
                }

                // Update response status
                const { error: responseError } = await supabase
                    .from('pir_responses')
                    .update({ status: status as ResponseStatus })
                    .eq('id', responseId);
                if (responseError) throw new Error(`Failed to update response status: ${responseError.message}`);
            }

            if (flagInserts.length > 0) {
                const { error: flagError } = await supabase
                    .from('response_flags')
                    .insert(flagInserts);
                if (flagError) throw new Error(`Failed to save flags: ${flagError.message}`);
            }

            // Determine final PIR status
            const finalStatus: PIRStatus = hasFlags ? 'flagged' : 'approved';

            // Update PIR status and product if approved
            const updatePayload: Database['public']['Tables']['pir_requests']['Update'] = {
                status: finalStatus,
                updated_at: new Date().toISOString(),
            };
            if (finalStatus === 'approved' && productId) {
                updatePayload.product_id = productId;
            }

            const { error: pirUpdateError } = await supabase
                .from('pir_requests')
                .update(updatePayload)
                .eq('id', pirId);
            if (pirUpdateError) throw new Error(`Failed to update PIR status: ${pirUpdateError.message}`);

            return { finalStatus };
        },
        onSuccess: async (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pirDetailsForReview', variables.pirId] });
            queryClient.invalidateQueries({ queryKey: ['pirRequests'] });
            toast.success(`Review submitted. Final status: ${data.finalStatus}`);

            try {
                // Fetch the updated PIR record for notification
                console.log("Fetching PIR record for completion notification...");
                const { data: updatedPirRecord, error: fetchError } = await supabase
                    .from('pir_requests')
                    .select(`
                        *,
                        products(name),
                        supplier:companies!pir_requests_supplier_company_id_fkey(name, contact_email),
                        customer:companies!pir_requests_customer_id_fkey(name, contact_email)
                    `)
                    .eq('id', variables.pirId)
                    .single();

                if (fetchError || !updatedPirRecord) {
                    throw new Error(`Failed to fetch updated PIR record for notification: ${fetchError?.message || 'Not found'}`);
                }

                console.log("Sending completion notification with status:", updatedPirRecord.status);
                const { data: funcData, error: functionError } = await supabase.functions.invoke(
                    'send-email',
                    {
                        body: {
                            type: 'REVIEW_COMPLETED',
                            record: updatedPirRecord,
                        }
                    }
                );

                if (functionError) {
                    throw functionError;
                }

                console.log("Completion notification sent successfully:", funcData);
                toast.info(`Notification sent to supplier about review completion.`);

            } catch (notificationError: any) {
                console.error("Failed to send PIR review notification:", notificationError);
                console.error("Notification error details:", notificationError.stack || JSON.stringify(notificationError));
                toast.error(`Review submitted, but failed to send notification: ${notificationError.message}`);
            }
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

  // --- Fetch All Sections/Subsections Query ---
  const { data: allSectionsData, isLoading: isLoadingSections, error: errorSections } = useQuery<Section[], Error>({
    queryKey: ['allQuestionSections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_sections')
        .select('*');
      if (error) throw new Error(`Failed to fetch all sections/subsections: ${error.message}`);
      // Map DB structure to frontend Section type
      return (data || []).map(sec => ({
        id: sec.id,
        name: sec.name,
        description: sec.description,
        order: sec.order_index,
        parent_id: sec.parent_id,
        created_at: sec.created_at ? new Date(sec.created_at) : new Date(),
        updated_at: sec.updated_at ? new Date(sec.updated_at) : new Date(),
      } as Section));
    },
  });

  // Create sectionMap once allSectionsData is loaded
  const sectionMap = React.useMemo(() => {
    const map = new Map<string, Section>();
    (allSectionsData || []).forEach(sec => {
      map.set(sec.id, sec);
    });
    return map;
  }, [allSectionsData]);
  // --- End Fetch All Sections --- 


  const [activeTab, setActiveTab] = useState("flagged");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<string, "approved" | "flagged" | "pending">>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false); // State for view-only mode

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

      // 3. Fetch Questions based on Tags (Two-step process)
      const tagIds = tags.map(t => t.id);
      let questions: DBQuestionForReview[] = [];
      if (tagIds.length > 0) {
          // Step 3a: Get question IDs linked to the tags
          const { data: questionTagLinks, error: qtError } = await supabase
              .from('question_tags')
              .select('question_id')
              .in('tag_id', tagIds);

          if (qtError) throw new Error(`Failed to fetch question IDs for tags: ${qtError.message}`);

          const questionIds = [...new Set(questionTagLinks?.map(link => link.question_id).filter(Boolean) || [])];

          // Step 3b: Fetch questions using the IDs, including nested data
          if (questionIds.length > 0) {
              const { data: questionsData, error: qError } = await supabase
                  .from('questions')
                  .select(`
                      *,
                      subsection:question_sections!section_id (*)
                  `)
                  .in('id', questionIds);

              if (qError) throw new Error(`Failed to fetch questions data: ${qError.message}`);



              // Structure the fetched questions data
              const questionMap = new Map<string, DBQuestionForReview>();
              (questionsData || []).forEach(questionData => {
                  // Type assertion for joined data
                  const typedQuestionData = questionData as unknown as {
                      id: string; text: string; description: string | null; type: string; required: boolean | null; options: any; created_at: string | null; updated_at: string | null;
                      subsection: { id: string; name: string; description: string | null; order_index: number; parent_id: string | null; created_at: string | null; updated_at: string | null; } | null;
                  };

                  if (typedQuestionData && !questionMap.has(typedQuestionData.id)) {
                      // 1. Map the joined subsection data (question_sections record) to the Section type
                      const joinedSubsectionData = typedQuestionData.subsection;
                      const subsection: Section | undefined = joinedSubsectionData ? {
                          id: joinedSubsectionData.id,
                          name: joinedSubsectionData.name,
                          description: joinedSubsectionData.description,
                          order: joinedSubsectionData.order_index,
                          parent_id: joinedSubsectionData.parent_id,
                          created_at: joinedSubsectionData.created_at ? new Date(joinedSubsectionData.created_at) : new Date(),
                          updated_at: joinedSubsectionData.updated_at ? new Date(joinedSubsectionData.updated_at) : new Date(),
                      } : undefined;

                      // Parent section will be looked up later using component-level sectionMap

                      // 3. Construct the structured question
                      const structuredQuestion: DBQuestionForReview = {
                          id: typedQuestionData.id,
                          text: typedQuestionData.text,
                          description: typedQuestionData.description,
                          type: typedQuestionData.type as DBQuestionType,
                          required: typedQuestionData.required,
                          options: typedQuestionData.options,
                          created_at: typedQuestionData.created_at,
                          updated_at: typedQuestionData.updated_at,
                          tags: [], // Placeholder
                          subsection: subsection, // Assign the mapped subsection
                          section: undefined, // Placeholder: Will be populated later
                      };
                      questionMap.set(typedQuestionData.id, structuredQuestion);
                  }
              });
              questions = Array.from(questionMap.values());
              // Sort questions based on section/subsection order
              questions.sort((a, b) => {
                  // Use the top-level section property for section order
                  const sectionOrderA = a.section?.order || 0;
                  const sectionOrderB = b.section?.order || 0;
                  if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;

                  // Use the subsection property for subsection order
                  const subsectionOrderA = a.subsection?.order || 0;
                  const subsectionOrderB = b.subsection?.order || 0;
                  return subsectionOrderA - subsectionOrderB;
              });
          }
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
      // onSuccess is not a direct option here, handle in useEffect
  });

  // Effect to set locked state based on fetched data
  useEffect(() => {
    if (pirDetails?.pir?.status === 'approved') {
      setIsLocked(true);
    } else {
      setIsLocked(false); // Ensure it's reset if status changes
    }
  }, [pirDetails?.pir?.status]);

  // Initialize review status from existing data whenever PIR details are loaded
  useEffect(() => {
    if (pirDetails && pirDetails.responses) {
      // Create initial reviewStatus object
      const initialReviewStatus: Record<string, "approved" | "flagged" | "pending"> = {};
      const initialReviewNotes: Record<string, string> = {};
      
      // Set status based on response status and flags
      pirDetails.responses.forEach(response => {
        // Initialize with existing status or fallback to "pending"
        const hasFlags = response.response_flags && response.response_flags.length > 0;
        let status: "approved" | "flagged" | "pending" = "pending";
        
        if (response.status === "approved") {
          status = "approved";
        } else if (response.status === "flagged" || hasFlags) {
          status = "flagged";
          
          // If there are flags, get the latest flag's description as the note
          if (hasFlags) {
            const latestFlag = response.response_flags
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
            initialReviewNotes[response.id] = latestFlag.description || "";
          }
        }
        
        initialReviewStatus[response.id] = status;
      });
      
      // Update state
      setReviewStatus(initialReviewStatus);
      setReviewNotes(initialReviewNotes);
      
      // Set isLocked based on PIR status
      setIsLocked(pirDetails.pir.status === "approved");
    }
  }, [pirDetails]);

  // --- End Fetch PIR Details Query ---

  // Submit Review Mutation
  const submitReviewMutation = useSubmitReviewMutation(queryClient);

  // Initialize expanded sections
  useEffect(() => {
      if (pirDetails?.questions && pirDetails.questions.length > 0) {
          const initialExpanded: Record<string, boolean> = {};
          pirDetails.questions.forEach(q => {
              const sectionId = q.section?.id || "unsectioned"; // Use direct section property
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
      const sectionId = question.section?.id || "unsectioned"; // Use direct section property
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(question);
      return acc;
    }, {} as Record<string, DBQuestionForReview[]>);

  const questionsBySubsection = Object.entries(questionsBySections).reduce(
    (acc, [sectionId, sectionQuestions]) => {
      acc[sectionId] = sectionQuestions.reduce(
        (subAcc, question) => {
          const subsectionId = question.subsection?.id || "unsubsectioned"; // Use subsection property id
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

  // Filter questions - Updated to handle missing answers and exclude approved answers in subsequent rounds
  const getFilteredQuestions = (sectionQuestions: DBQuestionForReview[]): DBQuestionForReview[] => {
    return sectionQuestions.filter(q => {
        const answer = answersMap[q.id];
        const status = reviewStatus[answer?.id] || "pending"; // Default to pending if no answer/status yet
        const hasFlags = answer?.flags && answer.flags.length > 0;

        if (activeTab === "all") {
            // In subsequent review rounds, don't show previously approved answers
            if (isPreviouslyReviewed && status === "approved") {
                return false;
            }
            return true;
        }

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
  const allApproved = totalAnsweredQuestions > 0 && approvedCount === totalAnsweredQuestions;

  // Set default tab
  useEffect(() => {
    if (isPreviouslyReviewed) {
      if (flaggedCount > 0) {
        setActiveTab("flagged"); // Show flagged items first in subsequent reviews
      } else if (pendingCount > 0) {
        setActiveTab("pending"); // If no flagged items but pending items exist, show those
      } else {
        setActiveTab("all"); // Default fallback
      }
    } else {
      setActiveTab("all"); // For initial reviews, show all items
    }
  }, [isPreviouslyReviewed, flaggedCount, pendingCount]);

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
    if (isLocked) {
        toast.info("This review is already approved and locked.");
        return; // Prevent submission if locked
    }
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
        productId: pirDetails.product?.id, // Pass the product ID
        userName: user.email || "Unknown Reviewer", // Use email or a default
        reviewStatuses: reviewStatus,
        reviewNotes: reviewNotes,
        // Pass context for notification
        supplierEmail: pirDetails.supplier?.contact_email,
        customerName: pirDetails.customer?.name,
        productName: pirDetails.product?.name,
    }, { onSuccess: () => { navigate("/supplier-products"); } }); // Updated navigation destination
  };
  // --- End Event Handlers ---

  // Helper functions
  const getSectionName = (sectionId: string): string => {
      if (sectionId === "unsectioned") return "General Questions";
      const questionInSection = sheetQuestions.find(q => q.section?.id === sectionId); // Use direct section property
      const section = questionInSection?.section; // Use direct section property
      return section ? `${section.order || '?'}. ${section.name}` : "Unknown Section";
  };
  const getSubsectionName = (subsectionId: string): string => { // Removed sectionId param as it's on the subsection
      if (subsectionId === "unsubsectioned") return "General";
      // Find the subsection directly from the sectionMap or the first question that has it
      const subsection = sectionMap.get(subsectionId); // More reliable lookup
      if (!subsection) return "Unknown Subsection";
      const section = subsection.parent_id ? sectionMap.get(subsection.parent_id) : undefined; // Look up parent section
      // Use order property which should now be correctly populated
      return `${section?.order ?? '?'}.${subsection.order ?? '?'} ${subsection.name}`;
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
                          subsection_id: question.subsection?.id || '', // Use subsection property id
                          // subsectionId: question.subsection_id || '', // Removed incorrect camelCase
                          // category_id: question.subsection_id || '', // Removed category_id if not in LocalQuestionType
                          // validation_rules: null, // Removed validation_rules
                          // created_by: '', // Removed created_by
                          // sectionId: question.subsection?.section?.id || '', // Removed sectionId as it's not in LocalQuestionType
                      };
                      // DEBUG: Log props being passed to ReviewQuestionItem
                      console.log(`CustomerReview: Rendering ReviewQuestionItem for Q:${question.id}`, { answerExists: !!answer, status, note: reviewNotes[answer?.id] || "" });
                      
                      // Determine if this specific question is locked - either the whole PIR is locked or the response is already approved
                      const isResponseLocked = isLocked || status === "approved" || (
                        // Also lock if the answer has been previously approved in the database
                        answer?.status === "approved"
                      );
                      
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
                            isLocked={isResponseLocked} // Pass response-specific locked state
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
