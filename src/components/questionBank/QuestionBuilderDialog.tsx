import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuestionBankContext } from "@/context/QuestionBankContext";
import { useSections } from "@/hooks/use-sections"; // Import useSections
import { Tag, Section } from "../../types/index"; // Use explicit relative path, Import Section type
import { X, Plus, Trash, Tag as TagIcon, FileDown, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TableBuilder } from "./TableBuilder"; // Use named import
import { TableColumn } from "@/types/index"; // Use full path for clarity
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TagBadge from "@/components/tags/TagBadge";
import { toast } from "sonner";
import { QuestionType, DBQuestion } from "@/hooks/use-question-bank"; // Removed Section import here
// Define Zod schemas for table structures based on TypeScript types
const columnTypeEnum = z.enum(["text", "number", "boolean", "select", "multi-select"]);

const nestedTableColumnsSchema = z.object({
  name: z.string().min(1, "Column name is required"),
  type: columnTypeEnum,
  options: z.array(z.string()).optional(), // For select/multi-select in nested
});

const tableColumnSchema = z.object({
  name: z.string().min(1, "Column name is required"),
  type: columnTypeEnum,
  options: z.array(z.string()).optional(), // For select/multi-select
  nested: z.boolean().optional(),
  nestedColumns: z.array(nestedTableColumnsSchema).optional(),
});

// Base schema for common fields
const baseSchema = z.object({
  sectionId: z.string().min(1, "Parent Section is required"),
  subsectionId: z.string().optional(),
  text: z.string().min(1, "Question text is required"),
  description: z.string().optional(),
  required: z.boolean().default(true),
});

// Discriminated union based on question type
const formSchema = z.discriminatedUnion("type", [
  // Type 'text' - no options field
  baseSchema.extend({
    type: z.literal("text"),
  }),
  // Type 'number' - no options field
  baseSchema.extend({
    type: z.literal("number"),
  }),
  // Type 'boolean' - no options field
  baseSchema.extend({
    type: z.literal("boolean"),
  }),
  // Type 'date' - no options field
  baseSchema.extend({
    type: z.literal("date"),
  }),
  // Type 'file' - no options field
  baseSchema.extend({
    type: z.literal("file"),
  }),
  baseSchema.extend({
    type: z.literal("single_select"),
    options: z.array(z.string()).min(1, "At least one option is required"),
  }),
  baseSchema.extend({
    type: z.literal("multi_select"),
    options: z.array(z.string()).min(1, "At least one option is required"),
  }),
  baseSchema.extend({
    type: z.literal("list_table"),
    options: z.array(tableColumnSchema).min(1, "At least one column is required"),
  }),
  // Type 'component_material_list' - no options field needed in the builder
  baseSchema.extend({
    type: z.literal("component_material_list"),
  }),
]);

type FormValues = z.infer<typeof formSchema>;

interface QuestionBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | null; // ID of the question being edited
  onClose: () => void;
  subsectionId?: string; // ID of the section/subsection to pre-select when creating new
}

export function QuestionBuilderDialog({
  open,
  onOpenChange,
  questionId,
  onClose,
  subsectionId: preselectedSectionId, // Rename prop for clarity
}: QuestionBuilderDialogProps) {
  const queryClient = useQueryClient(); // Get query client instance
  const {
    questions, // Contains section/subsection info from the view
    tags: availableTags, // Rename for clarity
    loading: contextLoading, // Rename to avoid conflict
    createQuestion,
    updateQuestion,
    createTag,
    addSection, // Use addSection for both sections and subsections
    // addSubsection removed
  } = useQuestionBankContext();
  const { data: dbSections, isLoading: sectionsLoading, error: sectionsError } = useSections(); // Fetch sections, correct destructuring
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newOption, setNewOption] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [bulkOptionsText, setBulkOptionsText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [showNewSubsectionForm, setShowNewSubsectionForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSubsectionName, setNewSubsectionName] = useState("");
  // Local state for dropdown options - derived from dbSections now
  const [localParentSections, setLocalParentSections] = useState<Section[]>([]);
  const [localSubsections, setLocalSubsections] = useState<Section[]>([]);
  const editingQuestion = useMemo(() => {
      return questionId ? questions.find(q => q.id === questionId) : null;
  }, [questionId, questions]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sectionId: "", // Parent section selection
      subsectionId: "", // Specific section/subsection for the question
      text: "",
      description: "",
      required: true,
      type: "text",
      // options field removed from defaultValues
    },
  });

  // Sections are now fetched via useSections hook above.
  // We will filter dbSections directly in useEffect hooks and dropdown rendering.

  const selectedParentSectionId = form.watch("sectionId"); // Watch the parent section dropdown

  const questionType = form.watch("type");
  const showOptionsInput = questionType === "single_select" || questionType === "multi_select";
  const showListTableBuilder = questionType === "list_table";
  // Other type checks can be simplified or removed if not needed for UI logic beyond options
  // const showFileUpload = questionType === "file";
  // const showBooleanOptions = questionType === "boolean";
  // const showDateOptions = questionType === "date";
  // const showNumberOptions = questionType === "number";
  // const showTextOptions = questionType === "text";
 
  // Sync local dropdown state with fetched dbSections
  useEffect(() => {
    if (open && dbSections) {
      // Filter for top-level sections (assuming level 1 or null parent_id)
      // Filter for top-level sections (parent_id is null)
      const parents = dbSections.filter(s => s.parent_id === null);
      // Map db data to Section type and sort by 'order'
      const mappedParents: Section[] = parents.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        order: p.order,
        parent_id: p.parent_id,
        // Omit created_at, updated_at to avoid type conflict
      }));
      setLocalParentSections(mappedParents.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      // Filter for subsections based on the currently selected parent section
      const currentParentId = form.getValues("sectionId");
      if (currentParentId) {
        const subs = dbSections.filter(s => s.parent_id === currentParentId); // Adjust filter as needed
        // Map db data to Section type and sort by 'order'
        const mappedSubs: Section[] = subs.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          order: s.order,
          parent_id: s.parent_id,
           // Omit created_at, updated_at to avoid type conflict
        }));
        setLocalSubsections(mappedSubs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } else {
        setLocalSubsections([]); // Clear subsections if no parent is selected
      }
    }
  }, [open, dbSections, form]); // Depend on dbSections and open state

  // Update subsections when parent selection changes
  useEffect(() => {
    if (open && dbSections && selectedParentSectionId) {
      const subs = dbSections.filter(s => s.parent_id === selectedParentSectionId); // Adjust filter as needed
      // Map db data to Section type and sort by 'order'
       const mappedSubs: Section[] = subs.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        order: s.order,
        parent_id: s.parent_id,
         // Omit created_at, updated_at to avoid type conflict
      }));
      setLocalSubsections(mappedSubs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      // Reset subsection selection if parent changes
      // form.setValue("subsectionId", ""); // Optional: Reset subsection selection
    } else if (open) {
       setLocalSubsections([]); // Clear if no parent selected
    }
  }, [selectedParentSectionId, open, dbSections]); // Depend on selected parent



  // Reset form when dialog opens/closes or data changes (including dbSections)
  useEffect(() => {
    if (open) {
      let defaultParentSectionId = "";
      let defaultSubsectionId = "";
      let defaultText = "";
      let defaultDescription = "";
      let defaultRequired = true;
      let defaultType: QuestionType = "text";
      let defaultOptions: string[] | TableColumn[] | null = null; // Allow different option types
      let defaultTags: Tag[] = [];

      if (editingQuestion) {
        // Editing existing question
        const currentSectionInfo = dbSections?.find(s => s.id === editingQuestion.section_id);
        if (currentSectionInfo) {
          if (currentSectionInfo.parent_id === null) { // Assuming top-level sections have null parent_id
            defaultParentSectionId = currentSectionInfo.id;
            defaultSubsectionId = "";
          } else {
            // It's a subsection, find its parent
            const parent = dbSections?.find(s => s.id === currentSectionInfo.parent_id);
            defaultParentSectionId = parent?.id || ""; // Set parent ID
            defaultSubsectionId = currentSectionInfo.id; // Set subsection ID
          }
        }
        defaultText = editingQuestion.text;
        defaultDescription = editingQuestion.description || "";
        defaultRequired = editingQuestion.required;
        defaultType = editingQuestion.type as FormValues['type']; // Cast to the specific literal type
        // Set options based on the actual type, ensuring correct structure
        if (defaultType === 'single_select' || defaultType === 'multi_select') {
            defaultOptions = Array.isArray(editingQuestion.options) ? editingQuestion.options.map(String) : [];
        } else if (defaultType === 'list_table') {
            // TODO: Add proper validation/parsing if options from DB aren't guaranteed TableColumn[]
            defaultOptions = Array.isArray(editingQuestion.options) ? editingQuestion.options : [];
        } else {
            defaultOptions = null;
        }
        defaultTags = editingQuestion.tags || [];

      } else if (preselectedSectionId) {
        // Creating new question with a preselected section/subsection
        const sectionInfo = dbSections?.find(s => s.id === preselectedSectionId);
        if (sectionInfo) {
          if (sectionInfo.parent_id === null) { // Assuming top-level sections have null parent_id
            defaultParentSectionId = sectionInfo.id;
            defaultSubsectionId = "";
          } else {
            // It's a subsection, find its parent and pre-select both
            const parent = dbSections?.find(s => s.id === sectionInfo.parent_id);
            defaultParentSectionId = parent?.id || "";
            defaultSubsectionId = sectionInfo.id;
          }
        }
      }

      // Reset the form with determined defaults
      // Reset form, asserting the type to handle the discriminated union
      form.reset({
        sectionId: defaultParentSectionId,
        subsectionId: defaultSubsectionId,
        text: defaultText,
        description: defaultDescription,
        required: defaultRequired,
        type: defaultType,
        // Set options based on type, ensuring correct structure for reset
        options: (defaultType === 'single_select' || defaultType === 'multi_select')
                 ? (defaultOptions as string[] || []) // Default to empty array if null/undefined
                 : (defaultType === 'list_table')
                 ? (defaultOptions as TableColumn[] || []) // Default to empty array if null/undefined
                 : null, // Explicitly null for other types
      } as FormValues); // Assert the entire object as FormValues
      setSelectedTags(defaultTags);
      // Reset local states for forms
      setShowNewSectionForm(false);
      setShowNewSubsectionForm(false);
      setNewSectionName("");
      setNewSubsectionName("");
      setNewOption("");
      setBulkOptionsText("");
      setShowBulkImport(false);
      // Reset local section state is handled by the sync effect above
      // setLocalParentSections([]); // Removed
      // setLocalSubsections([]); // Removed
    }
  }, [open, editingQuestion, dbSections, form, preselectedSectionId]); // Depend on dbSections now
 
  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.some((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }
    try {
      const newTag = await createTag({
        name: newTagName.trim(),
        description: "" // Empty string for now
      });
      setNewTagName("");
      setIsTagPopoverOpen(false);
      setSelectedTags(prev => [...prev, newTag]); // Add the new tag to selected tags
    } catch (error) {
      // Error toast is handled by the hook's mutation
      console.error('Error in handleCreateTag:', error);
    }
  };

  const addOption = () => { // Only for single/multi-select
    const currentType = form.getValues("type");
    if (currentType !== 'single_select' && currentType !== 'multi_select') return;
    if (newOption.trim()) {
      // Assert type as string[] since we checked the question type
      const currentOptions = (form.getValues("options") as string[] | null) || [];
      form.setValue("options", [...currentOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => { // Only for single/multi-select
    const currentType = form.getValues("type");
    if (currentType !== 'single_select' && currentType !== 'multi_select') return;
    // Assert type as string[]
    const currentOptions = (form.getValues("options") as string[] | null) || [];
    form.setValue("options", currentOptions.filter((_, i) => i !== index));
  };

  const handleBulkImportOptions = () => { // Only for single/multi-select
    const currentType = form.getValues("type");
    if (currentType !== 'single_select' && currentType !== 'multi_select') return;
    if (bulkOptionsText.trim()) {
      const newOptions = bulkOptionsText
        .split(/[\n,]/)
        .map(option => option.trim())
        .filter(option => option !== "");
      // Assert type as string[]
      const currentOptions = (form.getValues("options") as string[] | null) || [];
      form.setValue("options", [...currentOptions, ...newOptions]);
      setBulkOptionsText("");
      setShowBulkImport(false);
    }
  };

  // Handles creating top-level sections
  const handleCreateSection = async () => {
    console.log("[handleCreateSection] Start. newSectionName:", newSectionName);
    if (newSectionName.trim()) {
      setIsSubmitting(true); // Disable button while creating
      try {
        console.log("[handleCreateSection] Calling addSection...");
        const newSection = await addSection({
          name: newSectionName.trim(),
          description: "",
          order_index: localParentSections.length, // Provide order_index
          parent_id: null // Explicitly null for top-level
        });
        console.log("[handleCreateSection] addSection returned:", newSection);
        // No need to manually create dropdown entry if query invalidation works reliably.
        // If immediate update is needed, construct based on returned `newSection`
        // const newSectionForDropdown = { ...newSection, level: 1, number: 'temp' }; // Adjust based on actual Section type
        // console.log("[handleCreateSection] newSectionForDropdown:", newSectionForDropdown); // Removed dangling log

        // Update local state for dropdown
        // setLocalParentSections(prev => [...prev, newSectionForDropdown]); // Rely on query invalidation

        // Set form value AFTER updating local state
        console.log("[handleCreateSection] Calling form.setValue...");
        form.setValue("sectionId", newSection.id);
        form.setValue("subsectionId", "");

        setNewSectionName("");
        setShowNewSectionForm(false); // Close the inline form
        toast.success("Section created successfully?");

        // Invalidate for background sync AFTER local updates
        console.log("[handleCreateSection] Invalidating sections query...");
        queryClient.invalidateQueries({ queryKey: ['sections'] }); // Invalidate sections query
        console.log("[handleCreateSection] Finished.");
      } catch (error) {
        console.error("[handleCreateSection] Error:", error);
        toast.error("Failed to create section");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handles creating subsections (level 2)
  const handleCreateSubsection = async () => {
    console.log("[handleCreateSubsection] Start. newSubsectionName:", newSubsectionName, "selectedParentSectionId:", selectedParentSectionId);
    if (newSubsectionName.trim() && selectedParentSectionId) {
      setIsSubmitting(true); // Disable button while creating
      try {
        console.log("[handleCreateSubsection] Calling addSection...");
        const newSubsection = await addSection({ // Use addSection
          name: newSubsectionName.trim(),
          description: "",
          order_index: localSubsections.length, // Provide order_index
          parent_id: selectedParentSectionId // Set parent_id
        });
        console.log("[handleCreateSubsection] addSection returned:", newSubsection);
        // No need to manually create dropdown entry if query invalidation works reliably.
        // const newSubSectionForDropdown = { ...newSubsection, level: 2, number: 'temp' }; // Adjust based on actual Section type
        // console.log("[handleCreateSubsection] newSubSectionForDropdown:", newSubSectionForDropdown); // Removed dangling log

        // Update local state
        // setLocalSubsections(prev => [...prev, newSubSectionForDropdown]); // Rely on query invalidation

        // Set form value AFTER local state update
        console.log("[handleCreateSubsection] Calling form.setValue...");
        form.setValue("subsectionId", newSubsection.id);
        console.log("[handleCreateSubsection] form values after setValue:", form.getValues());

        setNewSubsectionName("");
        setShowNewSubsectionForm(false); // Close the inline form
        toast.success("Subsection created successfully");

        // Invalidate for background sync AFTER local updates
        console.log("[handleCreateSubsection] Invalidating sections query...");
        queryClient.invalidateQueries({ queryKey: ['sections'] }); // Invalidate sections query
        console.log("[handleCreateSubsection] Finished.");
      } catch (error) {
        console.error("[handleCreateSubsection] Error:", error);
        toast.error("Failed to create subsection");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    // The question belongs to the subsection if selected, otherwise the parent section
    const targetSectionId = values.subsectionId || values.sectionId;

    if (!targetSectionId) {
      toast.error("Please select a section or subsection for the question.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Serialize options to JSON for storage, matching DB expectation (Json | null)
      let optionsForDb: any | null = null;
      if (values.type === 'single_select' || values.type === 'multi_select' || values.type === 'list_table') {
        // Zod ensures values.options matches the type structure here
        optionsForDb = values.options ? JSON.parse(JSON.stringify(values.options)) : null;
      }

      const questionData = {
        text: values.text,
        description: values.description || null, // Use null if empty
        required: values.required,
        type: values.type as QuestionType, // Already validated by Zod
        options: optionsForDb, // Pass serialized options
        section_id: targetSectionId, // Use the determined target section/subsection ID
        tags: selectedTags,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData);
        toast.success("Question updated successfully");
      } else {
        await createQuestion(questionData);
        toast.success("Question created successfully");
      }
      onClose(); // Close dialog on success
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error(`Failed to save question: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingQuestion ? "Edit Question" : "Create New Question"}
          </DialogTitle>
          <DialogDescription>
            {editingQuestion ? "Modify the details of the existing question." : "Fill in the details to create a new question for the question bank."}
          </DialogDescription>
        </DialogHeader>

        {sectionsLoading || contextLoading ? ( // Check both loading states
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading Question Bank Data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1"> {/* Added padding */}
              <div className="grid gap-6">
                {/* Section Selection (Parent) */}
                <div className="space-y-2"> {/* Reduced spacing */}
                  <FormField
                    control={form.control}
                    name="sectionId" // Controls the parent section dropdown
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Section</FormLabel>
                        <div className="flex gap-2">
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("subsectionId", ""); // Reset subsection when parent changes
                            }}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Parent Section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {localParentSections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowNewSectionForm(!showNewSectionForm)}
                            disabled={isSubmitting}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showNewSectionForm && (
                    <div className="flex gap-2 items-center p-2 border rounded">
                      <Input
                        placeholder="New Parent Section Name"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateSection}
                        disabled={!newSectionName.trim() || isSubmitting}
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewSectionForm(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Subsection Selection */}
                <div className="space-y-2"> {/* Reduced spacing */}
                  <FormField
                    control={form.control}
                    name="subsectionId" // Controls the subsection dropdown
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subsection (Optional)</FormLabel>
                        <div className="flex gap-2">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedParentSectionId || isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Subsection (Optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {localSubsections.map((subsection) => (
                                <SelectItem key={subsection.id} value={subsection.id}>
                                   {subsection.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowNewSubsectionForm(!showNewSubsectionForm)}
                            disabled={!selectedParentSectionId || isSubmitting}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showNewSubsectionForm && selectedParentSectionId && (
                    <div className="flex gap-2 items-center p-2 border rounded">
                      <Input
                        placeholder="New Subsection Name"
                        value={newSubsectionName}
                        onChange={(e) => setNewSubsectionName(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateSubsection}
                        disabled={!newSubsectionName.trim() || isSubmitting}
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewSubsectionForm(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Question Text and Description */}
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter question text" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter question description" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags */}
                 <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <FormLabel>Tags</FormLabel>
                     <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                       <PopoverTrigger asChild>
                         <Button variant="outline" size="sm" disabled={isSubmitting}>
                           <TagIcon className="h-4 w-4 mr-2" />
                           Add Tag
                         </Button>
                       </PopoverTrigger>
                       <PopoverContent className="w-80 p-0">
                          <div className="p-4 space-y-2">
                            <h4 className="font-medium leading-none">Available Tags</h4>
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                                {availableTags.filter(at => !selectedTags.some(st => st.id === at.id)).map((tag) => (
                                    <TagBadge key={tag.id} tag={tag} onClick={() => toggleTag(tag)} />
                                ))}
                                {availableTags.filter(at => !selectedTags.some(st => st.id === at.id)).length === 0 && (
                                    <p className="text-xs text-muted-foreground">No more tags available.</p>
                                )}
                            </div>
                          </div>
                          <div className="border-t p-4">
                             <div className="grid gap-2">
                               <Label htmlFor="new-tag-name">Create New Tag</Label>
                               <div className="flex gap-2">
                                 <Input
                                   id="new-tag-name"
                                   placeholder="New tag name"
                                   value={newTagName}
                                   onChange={(e) => setNewTagName(e.target.value)}
                                   disabled={isSubmitting}
                                 />
                                 <Button type="button" size="sm" onClick={handleCreateTag} disabled={!newTagName.trim() || isSubmitting}>
                                   Create
                                 </Button>
                               </div>
                             </div>
                          </div>
                       </PopoverContent>
                     </Popover>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {selectedTags.map((tag) => (
                       <TagBadge key={tag.id} tag={tag} onClick={() => toggleTag(tag)} selected={true} />
                     ))}
                   </div>
                 </div>

                {/* Question Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select question type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="single_select">Single Select</SelectItem>
                          <SelectItem value="multi_select">Multi Select</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                          <SelectItem value="list_table">List Table</SelectItem>
                          <SelectItem value="component_material_list">Component/Material List</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Options Input for Select/Multi-Select */}
                {showOptionsInput && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel>Options</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkImport(!showBulkImport)}
                        disabled={isSubmitting}
                      >
                        {showBulkImport ? <X className="h-4 w-4 mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                        {showBulkImport ? "Cancel" : "Bulk Import"}
                      </Button>
                    </div>
                    {showBulkImport ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          value={bulkOptionsText}
                          onChange={(e) => setBulkOptionsText(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <Button type="button" size="sm" onClick={handleBulkImportOptions} disabled={!bulkOptionsText.trim() || isSubmitting}>
                          Import Options
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add an option"
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addOption();
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <Button type="button" size="sm" onClick={addOption} disabled={!newOption.trim() || isSubmitting}>
                          Add
                        </Button>
                      </div>
                    )}

                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {form.watch("options")?.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm p-1 bg-muted rounded"
                        >
                          <span>{option}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeOption(index)}
                            disabled={isSubmitting}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {(!form.watch("options") || form.watch("options")?.length === 0) && !showBulkImport && (
                         <p className="text-xs text-muted-foreground">No options added yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Table Builder for List Table */}
                {showListTableBuilder && (
                  <FormField
                    control={form.control}
                    name="options"
                    render={() => (
                      <FormItem>
                        <FormControl>
                          <TableBuilder form={form} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Required Checkbox */}
                <FormField
                  control={form.control}
                  name="required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Required</FormLabel>
                        <FormDescription>
                          Mark if this question must be answered.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingQuestion ? "Save Changes" : "Create Question"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
