import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuestionBankContext } from "@/context/QuestionBankContext";
import { Question, Tag, TableColumn } from "@/types"; // Import TableColumn
import { X, Plus, Trash, Tag as TagIcon, FileDown, Upload, Loader2 } from "lucide-react";
// Import DialogDescription
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TagBadge from "@/components/tags/TagBadge";
import { toast } from "sonner";
import { TableBuilder } from "./TableBuilder"; // Import TableBuilder
// Import correct types from hook
import { Section, Subsection, QuestionType } from "@/hooks/use-question-bank";

const formSchema = z.object({
  sectionId: z.string().min(1, "Section is required"),
  subsectionId: z.string().optional(),
  text: z.string().min(1, "Question text is required"),
  description: z.string().optional(),
  required: z.boolean().default(true),
  // Add LIST_TABLE to the enum
  type: z.enum(["text", "number", "boolean", "single_select", "multi_select", "date", "file", "LIST_TABLE"] as const),
  options: z.array(z.string()).optional(),
  // table_config is handled separately in component state, not directly in the form schema
});

type FormValues = z.infer<typeof formSchema>;

interface QuestionBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | null;
  onClose: () => void;
  subsectionId?: string;
}

export function QuestionBuilderDialog({
  open,
  onOpenChange,
  questionId,
  onClose,
  subsectionId,
}: QuestionBuilderDialogProps) {
  const { 
    questions, 
    sections, 
    subsections: allSubsections, // Rename to avoid conflict with filtered variable
    tags,
    loading,
    createQuestion,
    updateQuestion,
    createTag,
    addSection, 
    addSubsection, // Add the new function
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
  // State for table configuration
  const [tableConfig, setTableConfig] = useState<TableColumn[]>([]);

  const editingQuestion = questionId ? questions.find(q => q.id === questionId) : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sectionId: "",
      subsectionId: "",
      text: "",
      description: "",
      required: true,
      type: "text",
      options: [],
    },
  });

  // Sections are now top-level only from the hook
  const parentSections = sections || []; 
  
  // Filter subsections based on the selected sectionId from the form
  const selectedSectionId = form.watch("sectionId");
  const subsections = allSubsections?.filter(s => s.section_id === selectedSectionId) || [];

  const questionType = form.watch("type");

  // Update type checks for options visibility
  const showOptions = questionType === "single_select" || questionType === "multi_select";

  // Check if the type is LIST_TABLE
  const showTableBuilder = questionType === "LIST_TABLE";

  // Update type checks for file upload
  const showFileUpload = questionType === "file";

  // Update type checks for boolean options
  const showBooleanOptions = questionType === "boolean";

  // Update type checks for date options
  const showDateOptions = questionType === "date";

  // Update type checks for number options
  const showNumberOptions = questionType === "number";

  // Update type checks for text options
  const showTextOptions = questionType === "text";

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editingQuestion) {
        // For editing, find the subsection and its parent section ID
        const subsection = allSubsections?.find(s => s.id === editingQuestion.subsection_id);
        const sectionId = subsection?.section_id || ""; // Get parent section ID
        
        form.reset({
          sectionId,
          // Default to empty string or the actual subsection_id
          subsectionId: subsection ? editingQuestion.subsection_id : "", 
          text: editingQuestion.text,
          description: editingQuestion.description || "",
          required: editingQuestion.required,
          type: editingQuestion.type,
          options: editingQuestion.options || [],
        });
        setSelectedTags(editingQuestion.tags);
        // Initialize tableConfig if editing a LIST_TABLE question
        if (editingQuestion.type === 'LIST_TABLE') {
          setTableConfig(editingQuestion.table_config || []);
        } else {
          setTableConfig([]);
        }
      } else {
        // If subsectionId is provided, find its parent section
        let sectionId = "";
        if (subsectionId) {
          const subsection = allSubsections?.find(s => s.id === subsectionId);
          if (subsection?.section_id) {
            sectionId = subsection.section_id; // Use section_id
          }
        }
        
        form.reset({
          sectionId,
          subsectionId: subsectionId || "", // Default to empty string
          text: "",
          description: "",
          required: true,
          type: "text",
          options: [],
        });
        setSelectedTags([]);
        setTableConfig([]); // Reset table config for new questions
      }
    } else {
       setTableConfig([]); // Reset table config when dialog closes
    }
  }, [open, editingQuestion, sections, form, subsectionId, allSubsections]); // Added allSubsections

  const toggleTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
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
      
      // If we get here, tag was created successfully
      setNewTagName("");
      setIsTagPopoverOpen(false);
      
      // Add the new tag to selected tags
      setSelectedTags(prev => [...prev, newTag]);
      
    } catch (error) {
      // Error message is already handled by createTag function
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
    form.setValue(
      "options",
      currentOptions.filter((_, i) => i !== index)
    );
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

  const handleCreateSection = async () => {
    if (newSectionName.trim()) {
      try {
        // Call addSection with data matching the Section type
        const newSection = await addSection({ 
          name: newSectionName.trim(),
          description: "", // Assuming description is optional or handled
          order_index: parentSections.length 
        });
        if (newSection) {
          form.setValue("sectionId", newSection.id);
          setNewSectionName("");
          setShowNewSectionForm(false);
          toast.success("Section created successfully");
        }
      } catch (error) {
        toast.error("Failed to create section");
      }
    }
  };

  const handleCreateSubsection = async () => {
    if (newSubsectionName.trim() && selectedSectionId) {
      try {
        // Call addSubsection with data matching the Subsection type
        const newSubsection = await addSubsection({ 
          name: newSubsectionName.trim(),
          description: "", // Assuming description is optional or handled
          section_id: selectedSectionId, // Pass the parent section ID
          order_index: subsections.length 
        });
        if (newSubsection) {
          form.setValue("subsectionId", newSubsection.id);
          setNewSubsectionName("");
          setShowNewSubsectionForm(false);
          toast.success("Subsection created successfully");
        }
      } catch (error) {
        toast.error("Failed to create subsection");
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    // Ensure a subsection is selected
    if (!values.subsectionId) {
      toast.error("Please select or create a subsection for the question.");
      setIsSubmitting(false);
      return; 
    }

    try {
      const questionData = {
        text: values.text,
        description: values.description || "",
        required: values.required,
        type: values.type as QuestionType, // Cast to ensure LIST_TABLE is included if hook type is updated
        options: (values.type === 'single_select' || values.type === 'multi_select') ? values.options || [] : null, // Only include options for relevant types
        subsection_id: values.subsectionId,
        tags: selectedTags,
        // Include table_config only if the type is LIST_TABLE
        table_config: values.type === 'LIST_TABLE' ? tableConfig : null,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData);
        toast.success("Question updated successfully");
      } else {
        await createQuestion(questionData);
        toast.success("Question created successfully");
      }

      onClose();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
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
          {/* Add DialogDescription */}
          <DialogDescription>
            {editingQuestion ? "Modify the details of the existing question." : "Fill in the details to create a new question for the question bank."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6">
                {/* Section Selection */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <div className="flex gap-2">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parentSections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewSectionForm(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showNewSectionForm && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="New section name"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                      />
                      <Button
                        type="button"
                        onClick={handleCreateSection}
                        disabled={!newSectionName.trim()}
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowNewSectionForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Optional Subsection Selection */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subsectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subsection</FormLabel> {/* Changed label to imply required */}
                        <div className="flex gap-2">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""} // Default value to empty string
                            disabled={!selectedSectionId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                {/* Updated placeholder */}
                                <SelectValue placeholder={selectedSectionId ? "Select a subsection" : "Select a section first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Removed the "None" option */}
                              {subsections.map((subsection) => (
                                <SelectItem key={subsection.id} value={subsection.id}>
                                  {subsection.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewSubsectionForm(true)}
                            disabled={!selectedSectionId}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showNewSubsectionForm && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="New subsection name"
                        value={newSubsectionName}
                        onChange={(e) => setNewSubsectionName(e.target.value)}
                      />
                      <Button
                        type="button"
                        onClick={handleCreateSubsection}
                        disabled={!newSubsectionName.trim()}
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowNewSubsectionForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question Text</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter question text"
                            {...field}
                          />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter question description (optional)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Tags</FormLabel>
                    <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <TagIcon className="h-4 w-4 mr-2" />
                          Add Tag
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium leading-none">Create New Tag</h4>
                          <div className="space-y-2">
                            <div className="grid gap-2">
                              <Label htmlFor="tagName">Tag Name</Label>
                              <Input 
                                id="tagName"
                                value={newTagName} 
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="Enter tag name"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-2">
                            <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                              Create Tag
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 border rounded-md">
                    {tags.map((tag) => (
                      <TagBadge
                        key={tag.id}
                        tag={tag}
                        selected={selectedTags.some((t) => t.id === tag.id)}
                        onClick={() => toggleTag(tag)}
                      />
                    ))}
                    {tags.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No tags available. Use the "Add Tag" button to create tags.
                      </div>
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a question type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="single_select">Single Choice</SelectItem>
                          <SelectItem value="multi_select">Multiple Choice</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                          <SelectItem value="LIST_TABLE">List Table</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {showOptions && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Options</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkImport(!showBulkImport)}
                        >
                          {showBulkImport ? "Single Entry" : "Bulk Import"}
                        </Button>
                      </div>
                    </div>

                    {showBulkImport ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Enter options, one per line or comma-separated"
                          value={bulkOptionsText}
                          onChange={(e) => setBulkOptionsText(e.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={handleBulkImportOptions}
                          className="w-full"
                        >
                          Import Options
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
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
                          />
                          <Button type="button" onClick={addOption}>
                            Add
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {form.watch("options")?.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-secondary/50 p-2 rounded"
                        >
                          <span>{option}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditionally render TableBuilder */}
                {showTableBuilder && (
                   <div className="space-y-4">
                     <Label>Table Configuration</Label>
                     <TableBuilder
                       columns={tableConfig}
                       onChange={setTableConfig}
                     />
                   </div>
                )}

                <FormField
                  control={form.control}
                  name="required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Required Question</FormLabel>
                        <FormDescription>
                          Make this question mandatory to answer
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingQuestion ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingQuestion ? "Update Question" : "Create Question"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
