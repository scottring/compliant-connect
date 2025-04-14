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
import { Json } from "@/types/supabase"; // Import Json type
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
    responses: (DBPIRResponse & { response_flags?: DBFlag[]; customer_review_status?: ResponseStatus | null })[]; // Added customer_review_status
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
            console.log("Current PIR status before update:", currentStatus);
            
            // Allow review if status is submitted or resubmitted
            // Allow review if status is submitted or resubmitted
            if (currentStatus !== 'submitted' && currentStatus !== 'resubmitted') {
                 console.warn(`[DEBUG] CustomerReview: Attempted review on PIR ${pirId} with invalid status: ${currentStatus}. Allowed: submitted, resubmitted.`);
                 // Allow proceeding if already 'in_progress' or 'reviewed' to handle potential race conditions or re-entries, but log warning.
                 // Check against the *new* potential intermediate/final statuses
                 if (currentStatus !== 'in_progress' && currentStatus !== 'reviewed' && currentStatus !== 'rejected') {
                    throw new Error(`Cannot initiate review for PIR with status: ${currentStatus}. Expected 'submitted' or 'resubmitted'.`);
                 }
            }

            // Intermediate 'in_progress' update and notification removed as per instructions.

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

            // Determine final PIR status based on whether any flags were generated in this submission
            // The 'hasFlags' variable was set earlier based on the 'reviewStatuses' input.
            let finalPirStatus: PIRStatus = hasFlags ? 'rejected' : 'reviewed';
            let pirUpdateErrorInReview: Error | null = null;
            console.log(`[DEBUG] CustomerReview: Determined final PIR status based on responses: ${finalPirStatus}`); // Add log

            // Update PIR status to 'in_review' if resubmitted and has flags
            if (currentStatus === 'resubmitted' && hasFlags) {
                const { error: pirUpdateError } = await supabase
                    .from('pir_requests')
                    .update({ status: 'in_review' })
                    .eq('id', pirId);
                if (pirUpdateError) {
                    pirUpdateErrorInReview = new Error(`Failed to update PIR status to in_review: ${pirUpdateError.message}`);
                } else {
                    finalPirStatus = 'rejected'; // Set finalPirStatus to rejected after in_review update
                }
            }

            // Update PIR status and product if approved (now 'reviewed')
            const updatePayload: Database['public']['Tables']['pir_requests']['Update'] = {
        status: finalPirStatus, // Use the determined status
                updated_at: new Date().toISOString(),
            };
            // Link product only if the final status is 'reviewed'
            if (finalPirStatus === 'reviewed' && productId)
                updatePayload.product_id = productId;


            const { error: pirUpdateErrorFinal } = await supabase
                .from('pir_requests')
                .update(updatePayload) // Payload already uses finalPirStatus
                .eq('id', pirId);
            if (pirUpdateErrorInReview) {
                throw pirUpdateErrorInReview;
            }
            if (pirUpdateErrorFinal) throw new Error(`Failed to update PIR status: ${pirUpdateErrorFinal.message}`);

            // Verify the final status update
            const { data: finalStatusCheck, error: finalCheckError } = await supabase
                .from('pir_requests')
                .select('status, updated_at')
                .eq('id', pirId)
                .single();

            console.log(`[DEBUG] CustomerReview: Verified final PIR ${pirId} status: ${finalStatusCheck?.status} (Updated at: ${finalStatusCheck?.updated_at}, Error: ${finalCheckError?.message})`);

            return { finalStatus: finalPirStatus }; // Return the determined status
        },
        onSuccess: async (data, variables) => {
            console.log(`[DEBUG] CustomerReview: Mutation onSuccess for PIR ${variables.pirId}. Final status determined by mutationFn: ${data.finalStatus}`);
            
            // Force complete invalidation of all queries
            await queryClient.invalidateQueries();
            queryClient.removeQueries(); // Remove all queries from cache
            
            toast.success(`Review submitted successfully! Status: ${data.finalStatus}`);

            // Attempt to send notification, but don't let it block the UI flow
            try {
                // Fetch the updated PIR record for notification
                console.log("Attempting to send email notification...");
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
                    console.warn(`Could not fetch PIR record for notification: ${fetchError?.message || 'Not found'}`);
                } else {
                    console.log("Sending completion notification with status:", updatedPirRecord.status);
                    try {
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
                            console.warn("Email notification failed, but review was submitted successfully:", functionError);
                        } else {
                            console.log("Email notification sent successfully:", funcData);
                            toast.info(`Notification sent to supplier about review completion.`);
                        }
                    } catch (emailError) {
                        console.warn("Failed to send email, but review was submitted successfully:", emailError);
                    }
                }
            } catch (notificationError: any) {
                console.warn("Failed to send notification, but review was submitted successfully:", notificationError);
            }
            
            // Redirect regardless of notification status
            console.log(`[DEBUG] CustomerReview: Redirecting to /supplier-products after review submission for PIR ${variables.pirId}`);
            window.location.href = "/supplier-products";
        },
        onError: (error) => {
            toast.error(`Failed to submit review: ${error.message}`);
        },
    });
};
// --- End Submit Review Mutation Hook ---

// --- Mutation to update individual response customer review status ---
type UpdateResponseStatusInput = {
    responseId: string;
    status: ResponseStatus;
};

const useUpdateResponseCustomerStatusMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<void, Error, UpdateResponseStatusInput> => {
    return useMutation<void, Error, UpdateResponseStatusInput>({
        mutationFn: async ({ responseId, status }) => {
            console.log(`[DEBUG] CustomerReview: Updating customer_review_status for response ${responseId} to ${status}`);
            const { error } = await supabase
                .from('pir_responses')
                .update({ customer_review_status: status })
                .eq('id', responseId);

            if (error) {
                console.error(`[DEBUG] CustomerReview: Failed to update customer_review_status for response ${responseId}:`, error);
                throw new Error(`Failed to update response status: ${error.message}`);
            }
            console.log(`[DEBUG] CustomerReview: Successfully updated customer_review_status for response ${responseId}`);
        },
        onSuccess: (_, variables) => {
            // Optionally invalidate specific queries if needed, but local state update might suffice
            // queryClient.invalidateQueries({ queryKey: ['pirDetails', pirId] });
            console.log(`[DEBUG] CustomerReview: Mutation onSuccess for updating response ${variables.responseId} status.`);
            // No toast here, keep UI less noisy for individual actions
        },
        onError: (error, variables) => {
            toast.error(`Failed to update status for response: ${error.message}`);
            // Optionally revert local state change here if needed
            console.error(`[DEBUG] CustomerReview: Mutation onError for updating response ${variables.responseId} status:`, error);
        },
    });
};
// --- End Update Response Status Mutation ---


const CustomerReview = () => {
  console.log("[DEBUG] CustomerReview: Component rendering started."); // ADD THIS LOG
  console.log("[DEBUG] CustomerReview: Component rendering started."); // ADD THIS LOG
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
  const updateResponseStatusMutation = useUpdateResponseCustomerStatusMutation(queryClient);

  // --- Fetch PIR Details Query ---
  const fetchPirDetailsForReview = async (id: string): Promise<PirDetailsForReview> => {
      // 1. Fetch PIR Request and related companies/product
      console.log("[DEBUG] Fetching PIR details...");
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
      console.log("[DEBUG] Fetched PIR details:", pirData);

      // 2. Fetch Tags associated with the PIR
      console.log("[DEBUG] Fetching tag links...");
      const { data: tagLinks, error: tagLinksError } = await supabase
          .from('pir_tags')
          .select('tag:tags(*)')
          .eq('pir_id', id);
      if (tagLinksError) throw new Error(`Failed to fetch PIR tags: ${tagLinksError.message}`);
      console.log("[DEBUG] Fetched tag links:", tagLinks);
      const tags = (tagLinks?.map(link => link.tag).filter(Boolean).flat() || []) as Tag[];
       console.log("Fetched PIR tags:", tags); // Log tags

      // 3. Fetch Questions based on Tags (Two-step process)
      const tagIds = tags.map(t => t.id);
      let questions: DBQuestionForReview[] = [];
      if (tagIds.length > 0) {
          // Step 3a: Get question IDs linked to the tags
          console.log("[DEBUG] Fetching question tag links...");
          const { data: questionTagLinks, error: qtError } = await supabase
              .from('question_tags')
              .select('question_id')
              .in('tag_id', tagIds);

          if (qtError) throw new Error(`Failed to fetch question IDs for tags: ${qtError.message}`);
          console.log("[DEBUG] Fetched question tag links:", questionTagLinks);

          const questionIds = [...new Set(questionTagLinks?.map(link => link.question_id).filter(Boolean) || [])];
          console.log("Extracted question IDs from tags:", questionIds); // Log questionIds
          console.log("Extracted question IDs from tags:", questionIds); // Log questionIds

          // Step 3b: Fetch questions using the IDs, including nested data
          if (questionIds.length > 0) {
              console.log("[DEBUG] Fetching questions data...");
              const { data: questionsData, error: qError } = await supabase
                  .from('questions')
                  .select(`
                      *,
                      subsection:question_sections!section_id (*)
                  `)
                  .in('id', questionIds);
                  console.log("Fetched questions data:", questionsData); // Log questionsData
                  console.log("Fetched questions data:", questionsData); // Log questionsData

              if (qError) throw new Error(`Failed to fetch questions data: ${qError.message}`);
              console.log("[DEBUG] Fetched questions data:", questionsData);



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
                          // Log question details here, especially type
                          // questionType: typedQuestionData.type,
                          // Log question details here, especially type
                          // questionType: typedQuestionData.type,
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
              console.log("Structured questions:", questions); // Log structured questions
              console.log("Structured questions:", questions); // Log structured questions
          }
      }

      // 4. Fetch Base Responses with Flags
      console.log("[DEBUG] Fetching base responses...");
      const { data: baseResponsesData, error: responsesError } = await supabase
          .from('pir_responses')
          .select('*, customer_review_status, response_flags(*)') // Fetch nested flags AND customer_review_status
          .eq('pir_id', id);
      if (responsesError) throw new Error(`Failed to fetch base responses: ${responsesError.message}`);
      console.log("[DEBUG] Fetched base responses:", baseResponsesData);

      // 5. Fetch and structure Component/Material data for relevant responses
      const componentMaterialQuestionIds = questions
          .filter(q => q.type === 'component_material_list')
          .map(q => q.id);
      console.log("[DEBUG] CustomerReview: Component/Material Question IDs:", componentMaterialQuestionIds); // Log 1

      // Initialize with base data and ensure response_flags is an array
      const responsesWithComponents = (baseResponsesData || []).map(response => ({
          ...response,
          response_flags: response.response_flags || [],
      }));

      if (componentMaterialQuestionIds.length > 0) {
          const relevantResponseIds = responsesWithComponents
              .filter(r => r.question_id && componentMaterialQuestionIds.includes(r.question_id))
              .map(r => r.id);
          console.log("[DEBUG] CustomerReview: Relevant Response IDs for Components:", relevantResponseIds); // Log 2

          if (relevantResponseIds.length > 0) {
              // Fetch components linked to these responses
              console.log("[DEBUG] Fetching components data...");
              const { data: componentsData, error: componentsError } = await supabase
                  .from('pir_response_components')
                  .select('*')
                  .in('pir_response_id', relevantResponseIds)
                  .order('order_index', { ascending: true }); // Ensure components are ordered

              console.log("[DEBUG] Fetched components data:", componentsData);
              if (componentsError) throw new Error(`Failed to fetch components: ${componentsError.message}`);
              console.log("[DEBUG] CustomerReview: Fetched componentsData:", componentsData); // Log 3

              const componentIds = (componentsData || []).map(c => c.id);
              console.log("[DEBUG] CustomerReview: Component IDs:", componentIds); // Log 4

              let materialsData: Database['public']['Tables']['pir_response_component_materials']['Row'][] = [];
              if (componentIds.length > 0) {
                  // Fetch materials linked to these components
                  console.log("[DEBUG] Fetching materials data...");
                  const { data: fetchedMaterials, error: materialsError } = await supabase
                      .from('pir_response_component_materials')
                      .select('*')
                      .in('component_id', componentIds)
                      .order('order_index', { ascending: true }); // Ensure materials are ordered

                  if (materialsError) throw new Error(`Failed to fetch materials: ${materialsError.message}`);
                  console.log("[DEBUG] Fetched materials data:", fetchedMaterials);
                  materialsData = fetchedMaterials || [];
                  console.log("[DEBUG] CustomerReview: Fetched materialsData:", materialsData); // Log 5
              } else {
                  console.log("[DEBUG] CustomerReview: No component IDs found, skipping material fetch."); // Log 5 Alt
              }

              // Structure the data: Group materials by component_id
              const materialsByComponentId = materialsData.reduce((acc, material) => {
                  const componentId = material.component_id;
                  if (!acc[componentId]) {
                      acc[componentId] = [];
                  }
                  acc[componentId].push(material);
                  return acc;
              }, {} as Record<string, Database['public']['Tables']['pir_response_component_materials']['Row'][]>);
              console.log("[DEBUG] CustomerReview: Grouped materialsByComponentId:", JSON.stringify(materialsByComponentId)); // Log 6

              // Structure the data: Group components by response_id and attach materials
              const componentsByResponseId = (componentsData || []).reduce((acc, component) => {
                  const responseId = component.pir_response_id;
                  if (!acc[responseId]) {
                      acc[responseId] = [];
                  }
                  // Attach the grouped materials to each component
                  const componentWithMaterials = {
                      ...component,
                      materials: materialsByComponentId[component.id] || []
                  };
                  acc[responseId].push(componentWithMaterials);
                  return acc;
              }, {} as Record<string, (Database['public']['Tables']['pir_response_components']['Row'] & { materials: Database['public']['Tables']['pir_response_component_materials']['Row'][] })[]>);
              // Log 7 is added later in the merge section


              // Merge the structured component data into the relevant responses
              console.log("[DEBUG] CustomerReview: Merging component data. componentsByResponseId:", JSON.stringify(componentsByResponseId)); // Log the grouped data
              responsesWithComponents.forEach(response => {
                  // Only process if it's a component/material question
                  if (componentMaterialQuestionIds.includes(response.question_id || '')) {
                      console.log(`[DEBUG] CustomerReview: Processing response ${response.id} (Q: ${response.question_id}). Has data in componentsByResponseId?`, !!componentsByResponseId[response.id]);
                      if (componentsByResponseId[response.id]) { // Check if data exists for this response
                          // Replace the potentially simple 'answer' field with the structured data
                          // Use 'unknown' then 'Json' for type safety if needed, assuming the structure matches Json requirements
                          response.answer = componentsByResponseId[response.id] as unknown as Json; // <--- THIS IS THE KEY LINE
                          console.log(`[DEBUG] CustomerReview: Overwrote response.answer for ${response.id} with structured data:`, JSON.stringify(response.answer)); // Log the overwritten value
                      } else {
                          console.log(`[DEBUG] CustomerReview: No component data found for response ${response.id}. response.answer remains:`, response.answer);
                      }
                  }
                  // Log the final state of response.answer for this specific question type after potential modification
                  if (componentMaterialQuestionIds.includes(response.question_id || '')) {
                      console.log(`[DEBUG] CustomerReview: Final response.answer for component/material Q ${response.question_id} (Response ID: ${response.id}):`, JSON.stringify(response.answer, null, 2)); // ADD THIS LOG
                  }
                  // ELSE: If not a component/material question, response.answer remains unchanged
              });
          }
      }
      // Use the processed responses array which now includes structured component data where applicable
      const responsesData = responsesWithComponents;

      const safePirData = pirData as Database['public']['Tables']['pir_requests']['Row'];

      return {
          pir: safePirData,
          product: pirData.product as any,
          supplier: pirData.supplier as Company | null,
          customer: pirData.customer as Company | null,
          tags: tags,
          questions: questions,
          // Use the potentially augmented responsesData
          responses: responsesData as (DBPIRResponse & { response_flags?: DBFlag[] })[],
      };
  };
  console.log("[DEBUG] CustomerReview: Setting up useQuery for pirDetailsForReview..."); // ADD THIS LOG

  const {
      data: pirDetails,
      isLoading: isLoadingPir,
      error: errorPir,
  } = useQuery<PirDetailsForReview, Error>({
      queryKey: ['pirDetailsForReview', pirId],
      queryFn: () => fetchPirDetailsForReview(pirId!),
      enabled: !!pirId,
  });

  // Determine if the review is in a read-only state
  // PIR should be read-only AFTER the customer submits their review, until supplier responds again
  const isReadOnly = React.useMemo(() => {
    // Determine if the form should be read-only based on PIR status
    // Aligning with the useEffect logic which seems correct for terminal states.
    if (!pirDetails?.pir) return false;
    const readOnlyStatuses: PIRStatus[] = ['reviewed', 'rejected', 'canceled']; // Final states where review is locked.
    console.log("[DEBUG] CustomerReview: Calculating isReadOnly. PIR Status:", pirDetails?.pir?.status);
    return readOnlyStatuses.includes(pirDetails.pir.status as PIRStatus);
  }, [pirDetails]);

  // Initialize state with read-only setting
  useEffect(() => {
    if (pirDetails?.pir) {
      // Lock if status is reviewed, rejected, or canceled (new terminal states)
      const terminalStatuses: PIRStatus[] = ['reviewed', 'rejected', 'canceled'];
      const shouldBeLocked = terminalStatuses.includes(pirDetails.pir.status as PIRStatus);
      console.log(`[DEBUG] CustomerReview: PIR status is ${pirDetails.pir.status}. Locked state set to: ${shouldBeLocked}`);
      // Pass the calculated boolean to setIsLocked
      setIsLocked(shouldBeLocked);
    }
  }, [pirDetails]);

  // Initialize review status from existing data whenever PIR details are loaded
  useEffect(() => {
    if (pirDetails && pirDetails.responses) {
      // Create initial reviewStatus object
      const initialReviewStatus: Record<string, "approved" | "flagged" | "pending"> = {};
      const initialReviewNotes: Record<string, string> = {};
      
      // For each response:
      // - If already 'approved' in database, mark as approved in UI
      // - If already 'flagged' in database, mark as flagged in UI
      // - Otherwise mark as pending
      pirDetails.responses.forEach(response => {
        const currentStatus = response.status as ResponseStatus | undefined;
        initialReviewStatus[response.id] = currentStatus === 'approved' 
          ? 'approved' 
          : currentStatus === 'flagged' 
            ? 'flagged' 
            : 'pending';
        
        // If flagged and has flags, pre-populate the note from the most recent flag
        if (currentStatus === 'flagged' && response.response_flags && response.response_flags.length > 0) {
          // Sort flags by creation date (newest first)
          const sortedFlags = [...response.response_flags].sort((a, b) => 
            new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
          );
          if (sortedFlags[0] && sortedFlags[0].description) {
            initialReviewNotes[response.id] = sortedFlags[0].description;
          }
        } else {
          initialReviewNotes[response.id] = '';
        }
      });
      
      setReviewStatus(initialReviewStatus);
      setReviewNotes(initialReviewNotes);
    }
  }, [pirDetails]);

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
  // Check if the status indicates a previous review cycle (e.g., rejected, resubmitted)
  const isPreviouslyReviewed = productSheet?.status === "rejected" || productSheet?.status === "resubmitted";

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
        customer_review_status: response.customer_review_status, // Add customer review status
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
    // Persist the status change
    updateResponseStatusMutation.mutate({ responseId, status: 'approved' });
    toast.success("Answer marked as approved");
   };
  const handleFlag = (responseId: string, note: string) => {
    if (!note?.trim()) { toast.error("Please add a note explaining the issue."); return; }
    setReviewStatus(prev => ({ ...prev, [responseId]: "flagged" }));
    setReviewNotes(prev => ({ ...prev, [responseId]: note }));
    // Persist the status change
    updateResponseStatusMutation.mutate({ responseId, status: 'flagged' });
    // Note: Flag creation still happens during the final submit (useSubmitReviewMutation)
    toast.info("Answer marked as flagged");
   };
  const handleUpdateNote = (responseId: string, note: string) => { setReviewNotes(prev => ({ ...prev, [responseId]: note })); };
  const handleSubmitReview = () => {
    console.log(`[DEBUG] CustomerReview: handleSubmitReview entered for PIR ${pirId}`);
    if (isLocked) {
        toast.info("This review is already completed and locked.");
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
    
    console.log("Submitting review for PIR:", pirId);
    
    // Show a loading indicator
    toast.loading("Submitting review...");
    
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
    });
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
  if (!pirDetails) { return ( <div className="py-12 text-center"> <h2 className="text-2xl font-bold mb-4">PIR not found</h2> <Button onClick={() => navigate(-1)}>Go Back</Button> </div> ); }

  const productName = pirDetails.product?.name ?? pirDetails.pir.suggested_product_name ?? 'Unknown Product';
  const pageTitle = pirDetails.pir.title || `Review - ${productName}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={pageTitle}
        subtitle={isPreviouslyReviewed
          ? "Reviewing previously flagged issues" // Clarified text
          : "Initial review"} // Simplified ternary
        actions={
          <>
            {isLocked && (
              <Button 
                variant="outline" 
                onClick={() => navigate("/supplier-products")}
                className="mr-2"
              >
                Back to Products
              </Button>
            )}
            {!isLocked && (
              <Button 
                className="bg-brand hover:bg-brand/90" 
                onClick={handleSubmitReview} 
                disabled={submitReviewMutation.isPending || Object.keys(reviewStatus).length === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            )}
          </>
        }
      />

      <Card>
        {/* ... Card Header & Content ... */}
      </Card>

      {isLocked && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md">
          <h3 className="font-medium mb-1">View-Only Mode</h3>
          <p>
            {/* Simplified message for locked state */}
            This review process is complete or the request has been canceled. No further actions are needed at this time.
          </p>
        </div>
      )}

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
                        answer?.status === "approved" as any  // Cast as any to resolve type error
                      );
                      
                      return (
                        <div key={question.id}>
                          <ReviewQuestionItem
                            question={questionForComponent} // Pass mapped question
                            answer={answer}
                            status={status}
                            customerReviewStatus={answer?.customer_review_status} // Pass down the persistent status
                            note={reviewNotes[answer.id] || ""}
                            onApprove={() => { if (answer) handleApprove(answer.id); }}
                            onFlag={(note) => { if (answer) handleFlag(answer.id, note); }}
                            onUpdateNote={(note) => { if (answer) handleUpdateNote(answer.id, note); }}
                            isLocked={isResponseLocked} // Pass response-specific locked state
                            // isPreviouslyFlagged is now handled internally by ReviewQuestionItem
                            // Pass responseId for context if needed (already available via 'answer.id')
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

      {/* Only show the bottom submit button if not locked */}
      {!isLocked && (
        <div className="mt-6 flex justify-end">
          <Button
            className="bg-brand hover:bg-brand/90"
            onClick={handleSubmitReview}
            // Disable only if submitting or if no review actions have been taken yet
            disabled={submitReviewMutation.isPending || Object.keys(reviewStatus).length === 0}
            size="lg" // Keep consistent size if desired
          >
            <Send className="mr-2 h-4 w-4" />
            {submitReviewMutation.isPending ? "Submitting..." : "Submit Final Review"} {/* Updated Text */}
          </Button>
        </div>
      )}
      
    </div>
  );
};

export default CustomerReview;
