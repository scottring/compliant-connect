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
import { Json, TablesInsert, TablesUpdate } from '@/types/supabase'; // Import Json type and Table types
import { PIRStatus, ResponseStatus, isValidPIRStatusTransition, isValidResponseStatusTransition } from '@/types/pir';
type DBPIRResponse = Database['public']['Tables']['pir_responses']['Row']; // Use generated row type
type DBFlag = Database['public']['Tables']['response_flags']['Row']; // Use generated row type for flags
import QuestionItem from "@/components/supplierResponse/QuestionItem";
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import TaskProgress from "@/components/ui/progress/TaskProgress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { toast } from "sonner";
import { useCompanyData } from '@/hooks/use-company-data'; // Import useCompanyData
import { useUser } from '@/hooks/use-user';

// Type for the combined PIR data fetched by the query
// Updated interface to include comments data fetched separately
interface PirDetailsWithComments {
    pir: Database['public']['Tables']['pir_requests']['Row'];
    product: { id: string; name: string; } | null;
    supplier: Company | null;
    customer: Company | null;
    tags: Tag[];
    questions: (DBQuestion & {
        question_sections?: Database['public']['Tables']['question_sections']['Row'] & {
            parent_section?: Database['public']['Tables']['question_sections']['Row'];
        };
    })[];
    responses: (DBPIRResponse & { response_flags?: DBFlag[] })[];
    comments: Database['public']['Tables']['pir_response_comments']['Row'][]; // Add comments array
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

// Define input type for the submit mutation
type SubmitResponsesInput = {
  pirId: string;
  responses: { id: string; questionId: string; value: any; questionType: QuestionType; comments: string[] }[]; // Added questionType
};

const useSubmitResponsesMutation = (
    queryClient: ReturnType<typeof useQueryClient>,
    navigate: ReturnType<typeof useNavigate>  // Add navigate function as a parameter
): UseMutationResult<void, Error, SubmitResponsesInput> => {
    return useMutation<void, Error, SubmitResponsesInput>({
        mutationFn: async ({ pirId, responses }) => {
            // 1. Validate current PIR status
            const { data: currentPir, error: pirFetchError } = await supabase
                .from('pir_requests')
                .select('status')
                .eq('id', pirId)
                .single();

            if (pirFetchError) {
                throw new Error(`Could not verify PIR status: ${pirFetchError.message}`);
            }
            
            const currentStatus = currentPir.status as PIRStatus;
            // Allow submission only from 'sent', 'rejected', or 'draft' states (matching isReadOnly logic)
            if (!['sent', 'rejected', 'draft'].includes(currentStatus)) {
                throw new Error(`Cannot submit responses when PIR is in ${currentStatus} status. PIR must be in 'sent', 'rejected', or 'draft' status.`);
            }

            // 2. Update all responses first
            const responseUpdates = responses.map(response => {
                const updateData: Partial<TablesUpdate<'pir_responses'>> & { pir_id: string; question_id: string } = {
                    // id: response.id, // DO NOT include the placeholder ID here. Upsert uses onConflict.
                    pir_id: pirId, // Need pir_id for upsert onConflict
                    question_id: response.questionId, // Need question_id for upsert onConflict
                    status: 'submitted' as ResponseStatus,
                    submitted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // Conditionally include the answer based on question type
                    ...(response.questionType !== 'component_material_list' && { answer: response.value }),
                    // If it *is* component_material_list, answer should already be null from updateAnswerMutation
                };
                // We don't need to explicitly handle comments here as they are in a separate table.
                return updateData;
            });

            const { error: responsesError } = await supabase
                .from('pir_responses')
                .upsert(responseUpdates);

            if (responsesError) {
                throw new Error(`Failed to update responses: ${responsesError.message}`);
            }

            // 3. If status was 'flagged', resolve all open flags
            // Resolve flags if the submission is coming from a 'rejected' state
            if (currentStatus === 'rejected') {
                // Get all response IDs for this PIR
                const responseIds = responses.map(r => r.id);
                
                // Update flags to be resolved
                const { error: flagsError } = await supabase
                    .from('response_flags')
                    .update({
                        status: 'resolved' as Database['public']['Enums']['flag_status'],
                        resolved_at: new Date().toISOString()
                    })
                    .in('response_id', responseIds)
                    .eq('status', 'open');
                
                if (flagsError) {
                    console.warn(`Some flags could not be resolved: ${flagsError.message}`);
                    // Continue despite error - we still want to update the PIR status
                }
            }

            // 4. Update PIR status to 'submitted'
            // 4. Update PIR status to 'submitted'
            // Determine the next status based on the current status
            const nextStatus: PIRStatus = currentStatus === 'rejected' ? 'resubmitted' : 'submitted';

            // 4. Update PIR status
            const { data: updateResult, error: pirUpdateError } = await supabase // Capture data and error
                .from('pir_requests')
                .update({
                    status: nextStatus, // Use the determined status
                    updated_at: new Date().toISOString()
                })
                .eq('id', pirId)
                .select() // Select the result to log it
                .single(); // Use single() if you expect one record or null

            if (pirUpdateError) {
                throw new Error(`Failed to update PIR status: ${pirUpdateError.message}`);
            } else {
            }
        },
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pirDetails', variables.pirId] });
            queryClient.invalidateQueries({ queryKey: ['pirRequests'] });
            queryClient.invalidateQueries({ queryKey: ['incomingPirs'] }); // Invalidate the supplier's incoming list
            toast.success('Responses submitted successfully');

            try {
                console.log("Fetching updated PIR record for notification...");
                const { data: updatedPirRecord, error: fetchError } = await supabase
                    .from('pir_requests')
                    .select('*, products(name), customer:companies!pir_requests_customer_id_fkey(name, contact_email), supplier:companies!pir_requests_supplier_company_id_fkey(name)')
                    .eq('id', variables.pirId)
                    .single();

                if (fetchError || !updatedPirRecord) {
                    throw new Error('Failed to fetch updated PIR record for notification');
                }

                console.log("Updated PIR record fetched:", updatedPirRecord);
                console.log("Sending email notification with type PIR_RESPONSE_SUBMITTED");

                // Use the correct project ID and function name
                const { data, error: functionError } = await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'PIR_RESPONSE_SUBMITTED',
                        record: updatedPirRecord,
                    }
                });

                if (functionError) {
                    console.error("Edge function error:", functionError);
                    throw new Error(`Edge function error: ${functionError.message}`);
                }

                console.log("Function response:", data);
                toast.info('Notification sent to customer about response submission.');
            } catch (notificationError: any) {
                console.error("Failed to send notification:", notificationError);
                console.error("Notification error details:", notificationError.stack || notificationError);
                toast.warning('Responses submitted successfully, but notification failed to send.');
            }
            
            // Navigate to "Our Products" page after successful submission
            navigate('/our-products');
        },
        onError: (error) => {
            toast.error(`Submission failed: ${error.message}`);
        }
    });
};

const SupplierResponseForm = () => {
  const { id: pirId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentCompany } = useCompanyData(); // Get current company context
  const { user } = useUser();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // --- Mutations (Moved to top level) ---
  const updateAnswerMutation = useMutation({
    mutationFn: async ({ questionId, value, questionType }: { questionId: string; value: any; questionType: QuestionType }) => {
      if (!pirId) throw new Error("PIR ID is missing");
      if (!user?.id) throw new Error("User ID is missing"); // Ensure user ID is available

      // --- Step 1: Upsert base pir_responses record ---
      // Always upsert to ensure the record exists and get its ID.
      // Set answer to null initially if it's component_material_list type.
      const baseResponseData: TablesInsert<'pir_responses'> = {
          pir_id: pirId,
          question_id: questionId,
          answer: questionType === 'component_material_list' ? null : value, // Conditional answer
          status: 'draft', // Keep status as draft
          // user_id: user.id, // Add user_id if your policy requires it for upsert/insert
      };

      const { data: upsertedResponse, error: upsertError } = await supabase
          .from('pir_responses')
          .upsert(baseResponseData, { onConflict: 'pir_id, question_id' }) // Ensure nulls overwrite (defaultToNull removed)
          .select('id') // Select the ID after upsert
          .single();

      if (upsertError || !upsertedResponse) {
          console.error("Error upserting base response:", upsertError);
          throw new Error(`Failed to save base response: ${upsertError?.message ?? 'Unknown error'}`);
      }

      const pirResponseId = upsertedResponse.id;

      // --- Step 2: Handle component_material_list specific logic ---
      if (questionType === 'component_material_list') {
          // Ensure value is an array (or handle potential null/undefined)
          const components = Array.isArray(value) ? value : [];

          // --- Step 2a: Delete existing components and materials for this response ---
          // Find component IDs associated with this response
          const { data: existingComponents, error: fetchCompError } = await supabase
              .from('pir_response_components')
              .select('id')
              .eq('pir_response_id', pirResponseId);

          if (fetchCompError) {
              console.error("Error fetching existing components:", fetchCompError);
              // Decide if this is critical - maybe log and continue? For now, throw.
              throw new Error(`Failed to fetch existing components: ${fetchCompError.message}`);
          }

          const existingComponentIds = existingComponents.map(c => c.id);

          // Delete materials first (due to potential FK constraints)
          if (existingComponentIds.length > 0) {
              const { error: deleteMatError } = await supabase
                  .from('pir_response_component_materials')
                  .delete()
                  .in('component_id', existingComponentIds);
              if (deleteMatError) {
                  console.error("Error deleting existing materials:", deleteMatError);
                  throw new Error(`Failed to clear old materials: ${deleteMatError.message}`);
              }
          }

          // Delete components
          const { error: deleteCompError } = await supabase
              .from('pir_response_components')
              .delete()
              .eq('pir_response_id', pirResponseId);

          if (deleteCompError) {
              console.error("Error deleting existing components:", deleteCompError);
              throw new Error(`Failed to clear old components: ${deleteCompError.message}`);
          }

          // --- Step 2b: Insert new components and materials ---
          for (const [compIndex, component] of components.entries()) { // Use for...of with entries() for index and await
              const componentInsert: TablesInsert<'pir_response_components'> = {
                  pir_response_id: pirResponseId,
                  component_name: component.name,
                  position: component.position, // Added position
                  order_index: compIndex, // Added order_index
              };
              const { data: newComponent, error: insertCompError } = await supabase
                  .from('pir_response_components')
                  .insert(componentInsert)
                  .select('id')
                  .single();

              if (insertCompError || !newComponent) {
                  console.error("Error inserting component:", insertCompError);
                  // Consider how to handle partial failures - rollback? For now, throw.
                  throw new Error(`Failed to insert component '${component.name}': ${insertCompError?.message}`);
              }

              const newComponentId = newComponent.id;
              const materials = Array.isArray(component.materials) ? component.materials : [];

              for (const [matIndex, material] of materials.entries()) { // Use for...of with entries() for index and await
                  const materialInsert: TablesInsert<'pir_response_component_materials'> = {
                      component_id: newComponentId,
                      material_name: material.name,
                      percentage: isNaN(parseFloat(String(material.percentage))) ? null : parseFloat(String(material.percentage)), // Convert to number, handle NaN
                      recyclable: material.recyclable, // Added recyclable
                      order_index: matIndex, // Added order_index
                  };
                  const { error: insertMatError } = await supabase
                      .from('pir_response_component_materials')
                      .insert(materialInsert);

                  if (insertMatError) {
                      console.error("Error inserting material:", insertMatError);
                      // Consider rollback? For now, throw.
                      throw new Error(`Failed to insert material '${material.name}' for component '${component.name}': ${insertMatError.message}`);
                  }
              } // End inner for...of loop (materials)
          } // End outer for...of loop (components)
      } // End of component_material_list specific logic

      // Return something meaningful, maybe the base response ID or void
      return { pirResponseId };
    },
    onSuccess: (data, variables) => {
      // Distinguish success message based on type?
      if (variables.questionType === 'component_material_list') {
          toast.success(`Component/Material list saved for question.`);
      } else {
          toast.success(`Answer saved for question.`);
      }
      queryClient.invalidateQueries({ queryKey: ['pirDetails', pirId] });
    },
    onError: (error: Error, variables) => {
      toast.error(`Failed to save answer: ${error.message}`);
    },
  });

  const submitResponsesMutation = useSubmitResponsesMutation(queryClient, navigate);

  // Define input type for the add comment mutation
  type AddCommentInput = {
    responseId: string;
    userId: string;
    commentText: string;
  };

  const useAddCommentMutation = (queryClient: ReturnType<typeof useQueryClient>, pirId: string | undefined) => {
    return useMutation<void, Error, AddCommentInput>({
      mutationFn: async ({ responseId, userId, commentText }) => {
        console.log("useAddCommentMutation: mutationFn started", { responseId, userId, commentText }); // Log start
        if (!responseId || !userId || !commentText) {
          console.error("useAddCommentMutation: Missing required data", { responseId, userId, commentText });
          throw new Error("Missing required data for adding comment.");
        }
        if (!user) {
          console.error("useAddCommentMutation: User not available");
          throw new Error("User not available.");
        }

        const { error } = await supabase
          .from('pir_response_comments')
          .insert({
            response_id: responseId,
            user_id: userId, // Use the authenticated user's ID
            comment_text: commentText,
          });

        if (error) {
          console.error("useAddCommentMutation: Error inserting comment:", error);
          throw new Error(`Failed to add comment: ${error.message}`);
        }
        console.log("useAddCommentMutation: Comment inserted successfully"); // Log success
      },
      onSuccess: () => {
        console.log("useAddCommentMutation: onSuccess triggered"); // Log onSuccess
        toast.success('Comment added successfully');
        // Invalidate the query to refetch comments
        queryClient.invalidateQueries({ queryKey: ['pirDetails', pirId] });
        console.log("useAddCommentMutation: Query invalidated"); // Log query invalidation
      },
      onError: (error) => {
        console.error("useAddCommentMutation: onError triggered", error); // Log onError
        toast.error(`Failed to add comment: ${error.message}`);
      }
    });
  };

  const addCommentMutation = useAddCommentMutation(queryClient, pirId);

  // --- Fetch PIR Details Query ---
  // Update return type to include comments
  const fetchPirDetails = async (id: string): Promise<PirDetailsWithComments> => {
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


          if (questionsError) {
              console.error("Error fetching questions for PIR tags:", questionsError);
              // Throw the error to trigger the main error boundary
              throw new Error(`Failed to fetch questions for PIR: ${questionsError.message}`);
          }
          // Process fetched questions to include tags
          // Process and sort only if questionsData is not null and not empty
          if (questionsData && questionsData.length > 0) {
              questions = questionsData.map((q: any) => {
                  const currentSection = q.question_sections as any; // Renamed from subsection
                  const parentSection = currentSection?.parent_section as any; // Renamed from section
                  // Ensure question_tags exists and is an array before mapping
                  const questionTags = (Array.isArray(q.question_tags) ? q.question_tags.map((qt: any) => qt.tags).filter(Boolean).flat() : []) as Tag[];
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
              questions.sort((a: PirDetailsWithComments['questions'][number], b: PirDetailsWithComments['questions'][number]) => {
                  const parentOrderA = a.question_sections?.parent_section?.order_index ?? Infinity; // Sort items without parent section last
                  const parentOrderB = b.question_sections?.parent_section?.order_index ?? Infinity;
                  if (parentOrderA !== parentOrderB) return parentOrderA - parentOrderB;

                  const currentOrderA = a.question_sections?.order_index ?? Infinity; // Sort items without current section last
                  const currentOrderB = b.question_sections?.order_index ?? Infinity;
                  if (currentOrderA !== currentOrderB) return currentOrderA - currentOrderB;

                  const questionOrderA = a.order_index ?? Infinity; // Sort items without order_index last
                  const questionOrderB = b.order_index ?? Infinity;
                  return questionOrderA - questionOrderB;
              });
          } else if (!questionsError) { // Only log if there wasn't already a fetch error
              // If questionsData is null or empty, questions remains []
              console.log(`No questions found or associated with PIR ${id} for tags: ${pirTagIds.join(', ')}`);
          }
      } else {
          }

      // Step 4: Fetch existing Responses for this PIR (to populate answers) with their flags
      // Step 4a: Fetch existing Responses for this PIR with their flags
      const { data: responsesData, error: responsesError } = await supabase
          .from('pir_responses')
          .select('*, response_flags(*)') // Fetch responses and flags
          .eq('pir_id', id);

      if (responsesError) throw new Error(`Failed to fetch existing PIR responses: ${responsesError.message}`);
      
      // Step 4b: Fetch comments separately for all responses associated with this PIR
      const responseIds = (responsesData || []).map(r => r.id);
      let commentsData: Database['public']['Tables']['pir_response_comments']['Row'][] = [];
      if (responseIds.length > 0) {
          const { data: fetchedComments, error: commentsError } = await supabase
              .from('pir_response_comments')
              .select('*')
              .in('response_id', responseIds);

          if (commentsError) throw new Error(`Failed to fetch PIR response comments: ${commentsError.message}`);
          commentsData = fetchedComments || [];
      }
      
      // Group comments by response_id for easier lookup
      const commentsByResponseId = commentsData.reduce((acc, comment) => {
          if (!acc[comment.response_id]) {
              acc[comment.response_id] = [];
          }
          acc[comment.response_id].push(comment);
          return acc;
      }, {} as Record<string, Database['public']['Tables']['pir_response_comments']['Row'][]>);


      // Step 5: Combine data
      const safePirData = pirData as Database['public']['Tables']['pir_requests']['Row'];
      return {
          pir: safePirData,
          product: pirData.product as any,
          supplier: pirData.supplier as Company | null,
          customer: pirData.customer as Company | null,
          tags: pirTags,
          questions: questions,
          responses: (responsesData || []) as (DBPIRResponse & { response_flags?: DBFlag[] })[],
          comments: commentsData, // Include fetched comments
      };
  };

  const { data: pirDetails, isLoading: isLoadingPir, error: errorPir } = useQuery<PirDetailsWithComments, Error>({
    queryKey: ['pirDetails', pirId],
    queryFn: () => fetchPirDetails(pirId!),
    enabled: !!pirId,
    retry: false, // Don't retry failed requests
  });

  // --- Effects (Moved to top level, but dependencies ensure they run only when needed) ---
  // Authorization Check
  useEffect(() => {
    // Ensure all necessary data is loaded and valid before performing the check
    // Note: isLoadingPir check is removed here as the effect runs after the loading state returns
    if (pirDetails?.pir && currentCompany) {
      const expectedSupplierId = pirDetails.pir.supplier_company_id;
      // Check if expectedSupplierId is actually present before comparing
      if (expectedSupplierId && currentCompany.id !== expectedSupplierId) {
        toast.error("Unauthorized: You are not the designated supplier for this request.");
        navigate('/unauthorized', { replace: true });
      } else if (!expectedSupplierId) {
        // Handle case where supplier ID might be missing on the PIR record
        console.error("PIR record is missing supplier_company_id:", pirDetails.pir.id);
        toast.error("Error: Request data is incomplete (missing supplier ID).");
        // Optionally navigate away or show an error state
        // navigate('/error-page', { replace: true });
      }
    }
    // Run check only when pirDetails or currentCompany changes *after* initial load
  }, [pirDetails, currentCompany, navigate]);


  // Initialize expanded sections based on fetched questions
  useEffect(() => {
    if (pirDetails?.questions) {
      const initialExpandedState: Record<string, boolean> = {};
      pirDetails.questions.forEach(question => {
        const parentSectionId = question.question_sections?.parent_section?.id ?? question.question_sections?.id ?? "root";
        // Default to true (expanded) if not already set
        if (initialExpandedState[parentSectionId] === undefined) {
          initialExpandedState[parentSectionId] = true;
        }
      });
      setExpandedSections(initialExpandedState);
    }
  }, [pirDetails?.questions]); // Depend only on the questions array

  // Show loading state
  if (isLoadingPir) {
      return <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>;
  }

  // Show error state
  if (errorPir) {
      return <div className="flex items-center justify-center h-screen">
          <div className="text-center p-6 bg-destructive/10 rounded-lg">
              <h2 className="text-xl font-bold mb-2">Error Loading Request</h2>
              <p className="text-muted-foreground mb-4">{errorPir.message}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
      </div>;
  }

  // Ensure we have valid data before rendering
  if (!pirDetails) {
      return <div className="flex items-center justify-center h-screen">
          <div className="text-center p-6 bg-destructive/10 rounded-lg">
              <h2 className="text-xl font-bold mb-2">Invalid Request Data</h2>
              <p className="text-muted-foreground">The request data could not be loaded.</p>
          </div>
      </div>;
  }

  // --- End Effects ---


  // TODO: Add Mutations for updating/submitting responses and adding comments


  // --- Derived State and Logic (using pirDetails) ---
  const productSheet = pirDetails?.pir; // This is pir_requests Row type
  const supplier = pirDetails?.supplier;
  const requester = pirDetails?.customer;
  const sheetQuestions = pirDetails?.questions ?? [];
  const sheetTags = pirDetails?.tags ?? [];
  const sheetResponses = pirDetails?.responses ?? [];
  const sheetComments = pirDetails?.comments ?? []; // Extract comments

  // Grouping logic for questions
  const questionsGrouped = sheetQuestions.reduce(
    (acc, question) => {
      const parentSectionId = question.question_sections?.parent_section?.id ?? question.question_sections?.id ?? "root";
      const currentSectionId = question.section_id ?? "unsectioned";

      if (!acc[parentSectionId]) {
        acc[parentSectionId] = {};
      }
      if (!acc[parentSectionId][currentSectionId]) {
        acc[parentSectionId][currentSectionId] = [];
      }
      acc[parentSectionId][currentSectionId].push(question);
      return acc;
    }, {} as Record<string, Record<string, PirDetailsWithComments['questions']>>); // Use updated type

  // Group comments by response_id for easier lookup
  const commentsByResponseId = sheetComments.reduce((acc, comment) => {
      if (!acc[comment.response_id]) {
          acc[comment.response_id] = [];
      }
      acc[comment.response_id].push(comment);
      return acc;
  }, {} as Record<string, Database['public']['Tables']['pir_response_comments']['Row'][]>);

  // Map DBPIRResponse to SupplierResponse, manually adding comments
  const answersMap = sheetResponses.reduce((acc, response) => {
    const responseComments = commentsByResponseId[response.id] || [];
    
    // Map DB comments to the frontend Comment type from src/types/index.ts
    const mappedComments = responseComments.map(comment => ({
      id: comment.id,
      answerId: comment.response_id, // Map response_id to answerId
      text: comment.comment_text,     // Map comment_text to text
      createdBy: comment.user_id,     // Map user_id to createdBy
      createdByName: `User (${comment.user_id.substring(0, 6)}...)`, // Placeholder for name
      createdAt: new Date(comment.created_at), // Convert timestamp string to Date object
    }));

    // Safely handle potentially null question_id
    if (response.question_id) {
      acc[response.question_id] = {
          id: response.id,
          questionId: response.question_id, // Use the checked value
          value: response.answer as any,
          comments: mappedComments,
          flags: response.response_flags || [],
      } as SupplierResponse;
    } else {
      // Log or handle responses missing a question_id if necessary
      console.warn("PIR Response missing question_id:", response.id);
    }
    return acc;
  }, {} as Record<string, SupplierResponse>);

  // --- End Derived State ---


  // --- End Mutations (definitions moved to top level) ---
  // --- End Add Comment Mutation ---

  const handleSubmit = async () => {
    if (!user) {
        toast.error("You must be logged in to submit responses");
        return;
    }

    if (!pirId) {
        toast.error("Missing PIR ID");
        return;
    }

    // Create a map for quick question lookup
    const questionMap = new Map(pirDetails.questions.map(q => [q.id, q]));

    const responsesToSubmit = Object.entries(answers).map(([questionId, value]) => {
        const question = questionMap.get(questionId);
        if (!question) {
            console.warn(`Question with ID ${questionId} not found in pirDetails. Skipping.`);
            return null; // Or handle error appropriately
        }
        return {
            id: `${pirId}_${questionId}`, // Composite key - Note: This might not match the actual response ID if it was newly created. Consider fetching actual IDs if needed.
            questionId,
            value,
            questionType: question.type, // Add question type
            comments: comments[questionId] || []
        };
    }).filter(response => response !== null) as { id: string; questionId: string; value: any; questionType: QuestionType; comments: string[] }[]; // Filter out nulls and assert type

    submitResponsesMutation.mutate({
        pirId,
        responses: responsesToSubmit
    });
  };

  const handleSaveAsDraft = () => { toast.info("Save as Draft functionality not fully implemented."); };
  // Updated handler to use the mutation and include question type
  const handleAnswerUpdate = (questionId: string, value: any, questionType: QuestionType) => {
    updateAnswerMutation.mutate({ questionId, value, questionType });
  };
  // Updated handler to save comments with logging
  const handleAddComment = (questionId: string, text: string) => {
    console.log("handleAddComment called:", { questionId, text }); // Log call
    if (!user) {
      console.error("handleAddComment: No user found.");
      toast.error("You must be logged in to add comments.");
      return;
    }
    if (!pirDetails) {
        console.error("handleAddComment: pirDetails not loaded.");
        toast.error("PIR details not loaded yet.");
        return;
    }

    // Find the response associated with this questionId
    const response = sheetResponses.find(r => r.question_id === questionId);
    console.log("handleAddComment: Found response:", response); // Log found response

    if (!response) {
      console.error("handleAddComment: No response found for questionId:", questionId);
      // TODO: Decide how to handle comments if no answer exists yet.
      // Option 2: Create a draft response automatically (might be complex).
      // For now, show an error.
      toast.error("Please save an answer before adding a comment.");
      return;
    }

    const mutationArgs = {
      responseId: response.id,
      userId: user.id,
      commentText: text,
    };
    console.log("handleAddComment: Calling addCommentMutation.mutate with:", mutationArgs); // Log mutation args
    addCommentMutation.mutate(mutationArgs);
  };
  // --- End Event Handlers ---


  const toggleSection = (sectionId: string) => { setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] })); };

  // Helper functions
  // Helper to get the name of a top-level section (group key)
  const getParentSectionName = (parentSectionId: string): string => {
      // Special case for root or unsectioned - should show as "General"
      if (parentSectionId === "root" || parentSectionId === "unsectioned") return "General";
      
      // Find a question belonging to this parent group to get the parent section's details
      // This assumes parentSectionId is the ID of the actual parent section OR the ID of the top-level section itself
      const questionInGroup = sheetQuestions.find(q => (q.question_sections?.parent_section?.id ?? q.question_sections?.id) === parentSectionId);
      const sectionInfo = questionInGroup?.question_sections?.parent_section ?? questionInGroup?.question_sections; // Get parent if exists, else the section itself
      
      // Handle potentially undefined/null order_index and name more safely
      if (!sectionInfo) return "Unknown Section";
      
      // Special case for "General" sections - show just "General" without numbering
      if (!sectionInfo.name || sectionInfo.name.toLowerCase() === "general") {
          return "General";
      }
      
      const orderIndex = sectionInfo.order_index !== null && sectionInfo.order_index !== undefined 
        ? sectionInfo.order_index 
        : '';
      const indexPrefix = orderIndex !== '' ? `${orderIndex}. ` : '';
      return `${indexPrefix}${sectionInfo.name}`;
  };

  // Helper to get the name of a subsection (the question's direct section)
  const getCurrentSectionName = (parentSectionId: string, currentSectionId: string): string => {
      // If this is "unsectioned", it should always display as "General"
      if (currentSectionId === "unsectioned") return "General";
      
      // Find a question with this section_id to get its details
      const questionInSection = sheetQuestions.find(q => q.section_id === currentSectionId);
      const currentSection = questionInSection?.question_sections;
      const parentSection = currentSection?.parent_section; // Check if it actually has a parent in the data

      if (!currentSection) return "Unknown Subsection";
      
      // Special case for General section - should have no numbering
      if (!currentSection.name || 
          currentSection.name.toLowerCase() === "general" ||
          (parentSection && parentSection.name?.toLowerCase() === "general")) {
          return "General";
      }

      // Safely handle undefined order_index values
      const parentOrderIndex = parentSection?.order_index !== null && parentSection?.order_index !== undefined 
        ? parentSection.order_index 
        : '';
      const currentOrderIndex = currentSection.order_index !== null && currentSection.order_index !== undefined 
        ? currentSection.order_index 
        : '';

      // Format with hierarchical numbering if a parent exists
      if (parentSection && parentSection.id === parentSectionId) {
          // This is a true subsection - check if we have valid order indexes before formatting
          const prefix = parentOrderIndex !== '' && currentOrderIndex !== '' 
            ? `${parentOrderIndex}.${currentOrderIndex} ` 
            : '';
          return `${prefix}${currentSection.name}`;
      } else {
          // This is likely a top-level section being rendered
          const prefix = currentOrderIndex !== '' ? `${currentOrderIndex}. ` : '';
          return `${prefix}${currentSection.name}`;
      }
  };

  const answeredQuestions = Object.keys(answersMap).length;
  const totalQuestions = sheetQuestions.length;
  const completionRate = totalQuestions > 0 ? Math.floor((answeredQuestions / totalQuestions) * 100) : 0;

  // Status display logic
  const getDisplayStatus = (): string => {
    if (!productSheet) return 'Loading...';
    const status = productSheet.status as PIRStatus; // Use the correct variable
    switch (status) {
      case 'sent': return 'New Request';
      case 'in_progress': return 'In Progress';
      case 'submitted': return 'Submitted';
      case 'rejected': return 'Needs Update'; // Map 'rejected' to 'Needs Update'
      case 'resubmitted': return 'Resubmitted';
      case 'reviewed': return 'Approved'; // Map 'reviewed' to 'Approved'
      case 'draft': return 'Draft (In Progress)'; // Keep draft distinct
      case 'canceled': return 'Canceled';
      // Handle legacy/unexpected statuses if necessary, or default
      default: return (status as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
  };
  const getStatusColorClass = (): string => {
     if (!productSheet) return "bg-gray-100 text-gray-800";
     const status = productSheet.status as PIRStatus; // Use the correct variable and type
     switch (status) {
       case 'sent': return 'bg-blue-100 text-blue-800'; // New Request
       case 'in_progress': return 'bg-blue-100 text-blue-800'; // In Progress
       case 'submitted': return 'bg-purple-100 text-purple-800'; // Submitted
       case 'resubmitted': return 'bg-purple-100 text-purple-800'; // Resubmitted
       case 'rejected': return 'bg-yellow-100 text-yellow-800'; // Needs Update (use yellow for attention)
       case 'reviewed': return 'bg-green-100 text-green-800'; // Approved
       case 'draft': return 'bg-orange-100 text-orange-800'; // Draft
       case 'canceled': return 'bg-gray-100 text-gray-800'; // Canceled
       default: return 'bg-gray-100 text-gray-800'; // Default/Unknown
     }
  };
  // --- End Status Logic ---

  // Get status from productSheet and add a helper to check if form should be read-only
  const isReadOnly = (): boolean => {
    if (!productSheet) return true; // Default to read-only if no sheet
    const status = productSheet.status as PIRStatus; // Use the correct variable and type
    // Allow editing only if status is 'sent' (New Request), 'rejected' (Needs Update), or 'draft'
    return !(status === 'sent' || status === 'rejected' || status === 'draft');
  };

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
        actions={!isReadOnly() ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAsDraft}> Save as Draft </Button>
            <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit}> Submit Response </Button>
          </div>
        ) : undefined}
      />

      {/* Show revisions required banner if status is 'rejected' */}
      {productSheet?.status === 'rejected' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md">
          <h3 className="font-medium mb-1">Revisions Required</h3>
          <p>
            Some of your answers need revision. Please look for the flagged answers below,
            make the necessary changes, and resubmit your response.
          </p>
        </div>
      )}

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
            <div><h3 className="font-medium text-sm text-muted-foreground mb-1">Date Requested</h3><p>{productSheet.created_at ? new Date(productSheet.created_at).toLocaleDateString() : 'N/A'}</p></div>
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
                  {Object.entries(sections).map(([currentSectionId, questions]) => {
                    // Skip showing subsection title if both parent and subsection are General
                    // Safely check if the section is considered "General"
                    const foundQuestionForSection = sheetQuestions.find(q => q.section_id === currentSectionId);
                    const currentSectionName = foundQuestionForSection?.question_sections?.name?.toLowerCase();

                    const isGeneralSection =
                      (parentSectionId === "root" || parentSectionId === "unsectioned") &&
                      (currentSectionId === "unsectioned" || currentSectionName === "general");
                    
                    return (
                      <div key={currentSectionId} className="space-y-6">
                        {/* Display the name of the current section (subsection) only if not in General/General case */}
                        {!isGeneralSection && (
                          <h3 className="font-medium text-lg border-b pb-2">
                            {getCurrentSectionName(parentSectionId, currentSectionId)}
                          </h3>
                        )}
                        {questions.map((question, index) => {
                          const answer: SupplierResponse | undefined = answersMap[question.id];

                          // Calculate hierarchical number
                          const parentOrder = question.question_sections?.parent_section?.order_index;
                          const currentOrder = question.question_sections?.order_index;
                          const questionOrder = index + 1; // 1-based index within the subsection

                          let hierarchicalNumber = '';
                          
                          // Special case for General section
                          const isGeneralQuestion = 
                            currentSectionId === "unsectioned" || 
                            parentSectionId === "root" ||
                            (question.question_sections?.name?.toLowerCase() === "general") ||
                            (question.question_sections?.parent_section?.name?.toLowerCase() === "general");
                          
                          if (isGeneralQuestion) {
                            // For General section questions, just show the question number
                            hierarchicalNumber = `${questionOrder}`;
                          } 
                          // Handle cases where section hierarchies exist
                          else if (parentOrder !== null && parentOrder !== undefined && currentOrder !== null && currentOrder !== undefined) {
                            // Both parent and section have order indexes
                            hierarchicalNumber = `${parentOrder}.${currentOrder}.${questionOrder}`;
                          } else if (currentOrder !== null && currentOrder !== undefined) {
                            // Only section has order index
                            hierarchicalNumber = `${currentOrder}.${questionOrder}`;
                          } else {
                            // No order indexes available, just use question number
                            hierarchicalNumber = `${questionOrder}`;
                          }

                          return (
                            <div key={question.id} className="border-t pt-6 first:border-t-0 first:pt-0">
                              <QuestionItem
                                // Pass the calculated number along with the question data
                                question={{ ...question, hierarchical_number: hierarchicalNumber }}
                                answer={answer} // Pass the correctly typed answer
                                pirId={productSheet.id} // Pass PIR ID using the new prop name
                                onAnswerUpdate={(value) => handleAnswerUpdate(question.id, value, question.type)}
                                onAddComment={(text) => handleAddComment(question.id, text)} // Pass question.id
                                isReadOnly={isReadOnly()} // Pass read-only state based on PIR status
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4">
         <Button variant="outline" onClick={() => navigate(-1)}> Cancel </Button>
        {!isReadOnly() && (
          <div className="space-x-2">
            <Button variant="outline" onClick={handleSaveAsDraft}> Save as Draft </Button>
            <Button className="bg-brand hover:bg-brand-700" onClick={handleSubmit}> Submit Response </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierResponseForm;
