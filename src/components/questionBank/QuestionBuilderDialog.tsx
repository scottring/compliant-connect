import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuestionBankContext } from "@/context/QuestionBankContext";
import { Tag } from "@/types"; // Keep Tag import
import { X, Plus, Trash, Tag as TagIcon, FileDown, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
// Removed Badge import as it wasn't used directly here
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TagBadge from "@/components/tags/TagBadge";
import { toast } from "sonner";
// Import only necessary types from hook
import { QuestionType, DBQuestion } from "@/hooks/use-question-bank"; // Removed Section, Subsection

// Updated Zod schema to use section_id consistently
const formSchema = z.object({
  sectionId: z.string().min(1, "Parent Section is required"), // Represents the top-level section selection
  subsectionId: z.string().optional(), // Represents the specific section/subsection where the question belongs
  text: z.string().min(1, "Question text is required"),
  description: z.string().optional(),
  required: z.boolean().default(true),
  type: z.enum(["text", "number", "boolean", "single_select", "multi_select", "date", "file", "LIST_TABLE"] as const),
  options: z.array(z.string()).optional(),
});

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
  // Local state for dropdown options
  const [localParentSections, setLocalParentSections] = useState<Array<{ id: string; name: string; level: number; number: string }>>([]);
  console.log('[render] localParentSections:', localParentSections);
  const [localSubsections, setLocalSubsections] = useState<Array<{ id: string; name: string; level: number; number: string }>>([]);
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
      options: [],
    },
  });

  // Derive sections and subsections from the questions array (fetched from view)
  const allSectionsFromView = useMemo(() => {
    if (!questions) return [];
    const sectionsMap = new Map<string, { id: string; name: string; level: number; number: string }>();
    questions.forEach(q => {
      // Ensure all necessary fields exist and the section hasn't been added yet
      if (q.section_id && q.section_name && q.section_level !== undefined && q.hierarchical_number && !sectionsMap.has(q.section_id)) {
        sectionsMap.set(q.section_id, {
          id: q.section_id,
          name: q.section_name,
          level: q.section_level,
          number: q.hierarchical_number // Store hierarchical number for parent matching
        });
      }
    });
    // Sort by hierarchical number for consistent order
    return Array.from(sectionsMap.values()).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [questions]);

  const parentSections = useMemo(() => {
    // Assuming level 1 indicates top-level sections based on the view definition
    return allSectionsFromView.filter(s => s.level === 1);
  }, [allSectionsFromView]);

  const selectedParentSectionId = form.watch("sectionId"); // Watch the parent section dropdown

  const subsections = useMemo(() => {
    if (!selectedParentSectionId) return [];
    // Find the selected parent section to get its hierarchical number
    const parentSection = allSectionsFromView.find(s => s.id === selectedParentSectionId && s.level === 1);
    if (!parentSection) return []; // Should not happen if selection is valid

    const parentNumberPrefix = parentSection.number + '.';
    // Filter all derived sections to find those that are level 2 AND start with the parent's number prefix
    return allSectionsFromView.filter(s => s.level === 2 && s.number.startsWith(parentNumberPrefix));
  }, [selectedParentSectionId, allSectionsFromView]);

  const questionType = form.watch("type");
  const showOptions = questionType === "single_select" || questionType === "multi_select";
  // Other type checks remain the same...
  const showFileUpload = questionType === "file";
  const showBooleanOptions = questionType === "boolean";
  const showDateOptions = questionType === "date";
  const showNumberOptions = questionType === "number";
  const showTextOptions = questionType === "text";
 
  // Sync local dropdown state with context-derived state
  useEffect(() => {
    if (open) {
      console.log("[Sync Effect] Running. parentSections:", parentSections, "subsections:", subsections);
      setLocalParentSections(parentSections);
      // Subsections depend on the selected parent, which might be set by the reset effect later
      // Re-evaluate subsections based on the *current* form value for sectionId
      const currentParentId = form.getValues("sectionId");
      const derivedSubsections = allSectionsFromView.filter(s => {
          if (!currentParentId || s.level !== 2) return false;
          const parentSection = allSectionsFromView.find(p => p.id === currentParentId && p.level === 1);
          return parentSection && s.number.startsWith(parentSection.number + '.');
      });
      setLocalSubsections(derivedSubsections);
      console.log("[Sync Effect] Finished. localParentSections:", parentSections, "localSubsections:", derivedSubsections);
    }
    // Dependencies: Run when dialog opens OR when derived sections change while open
  }, [open, parentSections, subsections, form, allSectionsFromView]); // <<<< KEY CHANGE HERE



  // Reset form when dialog opens/closes or data changes
  useEffect(() => {
    if (open) {
      let defaultParentSectionId = "";
      let defaultSubsectionId = "";
      let defaultText = "";
      let defaultDescription = "";
      let defaultRequired = true;
      let defaultType: QuestionType = "text";
      let defaultOptions: string[] = [];
      let defaultTags: Tag[] = [];

      if (editingQuestion) {
        // Editing existing question
        const currentSectionInfo = allSectionsFromView.find(s => s.id === editingQuestion.section_id);
        if (currentSectionInfo) {
          if (currentSectionInfo.level === 1) {
            defaultParentSectionId = currentSectionInfo.id;
            defaultSubsectionId = ""; // No subsection selected if question is in parent
          } else {
            // Find parent by matching hierarchical number prefix
            const parts = currentSectionInfo.number.split('.');
            if (parts.length > 1) {
              const parentNumber = parts[0];
              const parent = allSectionsFromView.find(s => s.level === 1 && s.number === parentNumber);
              defaultParentSectionId = parent?.id || "";
              defaultSubsectionId = currentSectionInfo.id; // This is the subsection
            }
          }
        }
        defaultText = editingQuestion.text;
        defaultDescription = editingQuestion.description || "";
        defaultRequired = editingQuestion.required;
        defaultType = editingQuestion.type;
        defaultOptions = Array.isArray(editingQuestion.options) ? editingQuestion.options : []; // Ensure options is array
        defaultTags = editingQuestion.tags || [];

      } else if (preselectedSectionId) {
        // Creating new question with a preselected section/subsection
        const sectionInfo = allSectionsFromView.find(s => s.id === preselectedSectionId);
        if (sectionInfo) {
          if (sectionInfo.level === 1) {
            defaultParentSectionId = sectionInfo.id; // Pre-select the parent section
            defaultSubsectionId = "";
          } else {
            // Find parent and pre-select both
            const parts = sectionInfo.number.split('.');
            if (parts.length > 1) {
              const parentNumber = parts[0];
              const parent = allSectionsFromView.find(s => s.level === 1 && s.number === parentNumber);
              defaultParentSectionId = parent?.id || "";
              defaultSubsectionId = sectionInfo.id; // Pre-select the subsection
            }
          }
        }
      }

      // Reset the form with determined defaults
      form.reset({
        sectionId: defaultParentSectionId,
        subsectionId: defaultSubsectionId,
        text: defaultText,
        description: defaultDescription,
        required: defaultRequired,
        type: defaultType,
        options: defaultOptions,
      });
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
  }, [open, editingQuestion, allSectionsFromView, form, preselectedSectionId]);
 
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

  const addOption = () => {
    if (newOption.trim()) {
      const currentOptions = form.getValues("options") || [];
      form.setValue("options", [...currentOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    const currentOptions = form.getValues("options") || [];
    form.setValue("options", currentOptions.filter((_, i) => i !== index));
  };

  const handleBulkImportOptions = () => {
    if (bulkOptionsText.trim()) {
      const newOptions = bulkOptionsText
        .split(/[\n,]/)
        .map(option => option.trim())
        .filter(option => option !== "");
      const currentOptions = form.getValues("options") || [];
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
          order_index: parentSections.length, // Simple ordering
          parent_id: null // Explicitly null for top-level
        });
        console.log("[handleCreateSection] addSection returned:", newSection);
        // Manually create dropdown entry
        let maxTopLevelNum = 0;
        localParentSections.forEach(s => { // Use local state for calculation
            if (s.level === 1 && s.number) {
                const num = parseInt(s.number.split('.')[0], 10);
                if (!isNaN(num) && num > maxTopLevelNum) {
                    maxTopLevelNum = num;
                }
            }
        });
        const tempHierarchicalNumber = `${maxTopLevelNum + 1}`;
        const newSectionForDropdown = {
            id: newSection.id,
            name: newSection.name,
            level: 1,
            number: tempHierarchicalNumber
        };
        console.log("[handleCreateSection] newSectionForDropdown:", newSectionForDropdown);

        // Update local state for dropdown
        setLocalParentSections(prev => {
          const newState = [...prev, newSectionForDropdown];
          console.log("[handleCreateSection] Updated localParentSections:", newState);
          return newState;
        }); // Correctly close setLocalParentSections

        // Set form value AFTER updating local state
        console.log("[handleCreateSection] Calling form.setValue...");
        form.setValue("sectionId", newSection.id);
        form.setValue("subsectionId", "");

        setNewSectionName("");
        setShowNewSectionForm(false); // Close the inline form
        toast.success("Section created successfully?");

        // Invalidate for background sync AFTER local updates
        console.log("[handleCreateSection] Invalidating queries...");
        queryClient.invalidateQueries({ queryKey: ['questions'], exact: true });
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
          order_index: subsections.length, // Simple ordering within parent
          parent_id: selectedParentSectionId // Set parent_id
        });
        console.log("[handleCreateSubsection] addSection returned:", newSubsection);
        // Manually create dropdown entry for subsection
        const parentSection = localParentSections.find(s => s.id === selectedParentSectionId);
        const parentNumber = parentSection?.number || '?';
        const tempSubNumber = `${parentNumber}.${localSubsections.length + 1}`; // Simple temp numbering

        const newSubSectionForDropdown = {
            id: newSubsection.id,
            name: newSubsection.name,
            level: 2, // Assuming created via subsection button
            number: tempSubNumber
        };
        console.log("[handleCreateSubsection] newSubSectionForDropdown:", newSubSectionForDropdown);

        // Update local state
        setLocalSubsections(prev => {
          const newState = [...prev, newSubSectionForDropdown];
          console.log("[handleCreateSubsection] Updated localSubsections:", newState);
          return newState;
        }); // Correctly close setLocalSubsections

        // Set form value AFTER local state update
        console.log("[handleCreateSubsection] Calling form.setValue...");
        form.setValue("subsectionId", newSubsection.id);
        console.log("[handleCreateSubsection] form values after setValue:", form.getValues());

        setNewSubsectionName("");
        setShowNewSubsectionForm(false); // Close the inline form
        toast.success("Subsection created successfully");

        // Invalidate for background sync AFTER local updates
        console.log("[handleCreateSubsection] Invalidating queries...");
        queryClient.invalidateQueries({ queryKey: ['questions'], exact: true });
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
      // Ensure options are string array or null
      let processedOptions: string[] | null = null;
      if (showOptions && Array.isArray(values.options)) {
          processedOptions = values.options.filter(opt => typeof opt === 'string');
      }

      const questionData = {
        text: values.text,
        description: values.description || null, // Use null if empty
        required: values.required,
        type: values.type as QuestionType, // Already validated by Zod
        options: processedOptions, // Use processed options
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

        {contextLoading ? ( // Use renamed loading state
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
                                <SelectValue placeholder="Select a parent section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Ensure mapping uses localParentSections */}
                              {localParentSections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  {section.name} ({section.number}) {/* Show number for clarity */}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon" // Make button smaller
                            onClick={() => setShowNewSectionForm(true)}
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
                        placeholder="New section name"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        className="flex-grow"
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        onClick={handleCreateSection}
                        disabled={!newSectionName.trim() || isSubmitting}
                        size="sm"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
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
                    name="subsectionId" // Controls the specific subsection selection
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subsection (Optional)</FormLabel>
                        <div className="flex gap-2">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""} // Handle empty string for placeholder
                            disabled={!selectedParentSectionId || isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedParentSectionId ? "Select a subsection (or leave blank)" : "Select a parent section first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Allow clearing selection via placeholder */}
                              {/* Ensure mapping uses localSubsections */}
                              {/* Use local state for options */}
                              {localSubsections.map((subsection) => (
                                <SelectItem key={subsection.id} value={subsection.id}>
                                  {subsection.name} ({subsection.number}) {/* Show number for clarity */}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon" // Make button smaller
                            onClick={() => setShowNewSubsectionForm(true)}
                            disabled={!selectedParentSectionId || isSubmitting}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showNewSubsectionForm && selectedParentSectionId && ( // Only show if parent is selected
                    <div className="flex gap-2 items-center p-2 border rounded">
                      <Input
                        placeholder="New subsection name"
                        value={newSubsectionName}
                        onChange={(e) => setNewSubsectionName(e.target.value)}
                        className="flex-grow"
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        onClick={handleCreateSubsection}
                        disabled={!newSubsectionName.trim() || isSubmitting}
                        size="sm"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
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
                   <div className="flex flex-wrap gap-1 min-h-[24px] p-1 border rounded">
                     {selectedTags.length > 0 ? selectedTags.map((tag) => (
                       <TagBadge key={tag.id} tag={tag} onClick={() => toggleTag(tag)} />
                     )) : <span className="text-xs text-muted-foreground">No tags selected</span>}
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
                          <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                          <SelectItem value="single_select">Single Select</SelectItem>
                          <SelectItem value="multi_select">Multi Select</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Options (for select types) */}
                {showOptions && (
                  <div className="space-y-3 p-3 border rounded">
                    <FormLabel>Options</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkImport(!showBulkImport)}
                        disabled={isSubmitting}
                      >
                        {showBulkImport ? <X className="h-4 w-4 mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                        {showBulkImport ? "Cancel Bulk Add" : "Bulk Add"}
                      </Button>
                    </div>

                    {showBulkImport ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Enter options separated by new lines or commas"
                          value={bulkOptionsText}
                          onChange={(e) => setBulkOptionsText(e.target.value)}
                          rows={4}
                          disabled={isSubmitting}
                        />
                        <Button type="button" size="sm" onClick={handleBulkImportOptions} disabled={!bulkOptionsText.trim() || isSubmitting}>
                          Add Options
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Input
                          placeholder="New option"
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
