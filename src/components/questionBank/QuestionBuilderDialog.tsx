import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuestionBankContext } from "@/context/QuestionBankContext";
import { Question, Tag } from "@/types";
import { X, Plus, Trash, Tag as TagIcon, FileDown, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const formSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  description: z.string().optional(),
  required: z.boolean().default(true),
  type: z.enum(["text", "number", "boolean", "select", "multi-select", "table", "file"]),
  options: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface QuestionBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | null;
  onClose: () => void;
}

export function QuestionBuilderDialog({
  open,
  onOpenChange,
  questionId,
  onClose,
}: QuestionBuilderDialogProps) {
  const { 
    questions, 
    tags,
    loading,
    createQuestion,
    updateQuestion,
    createTag
  } = useQuestionBankContext();
  
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newOption, setNewOption] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6"); // Default blue color
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [bulkOptionsText, setBulkOptionsText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editingQuestion = questionId ? questions.find(q => q.id === questionId) : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
      description: "",
      required: true,
      type: "text",
      options: [],
    },
  });

  const questionType = form.watch("type");

  useEffect(() => {
    if (editingQuestion) {
      form.reset({
        text: editingQuestion.text,
        description: editingQuestion.description || "",
        required: editingQuestion.required,
        type: editingQuestion.type,
        options: editingQuestion.options || [],
      });
      setSelectedTags(editingQuestion.tags);
    } else {
      form.reset({
        text: "",
        description: "",
        required: true,
        type: "text",
        options: [],
      });
      setSelectedTags([]);
    }
  }, [editingQuestion, form]);

  const toggleTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreateTag = async () => {
    if (newTagName.trim()) {
      try {
        const newTag = await createTag({
          name: newTagName.trim(),
          color: newTagColor,
          description: ""
        });
        setNewTagName("");
        setIsTagPopoverOpen(false);
        toast.success("Tag created successfully");
      } catch (error) {
        toast.error("Failed to create tag");
      }
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

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const questionData: Omit<Question, "id"> = {
        text: values.text,
        description: values.description,
        required: values.required,
        type: values.type,
        tags: selectedTags,
        options: values.type === "select" || values.type === "multi-select" ? values.options : undefined,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData);
      } else {
        await createQuestion(questionData);
      }

      onClose();
      toast.success(editingQuestion ? "Question updated successfully" : "Question created successfully");
    } catch (err) {
      console.error("Error saving question:", err);
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
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6">
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
                          <div className="grid gap-2">
                            <Label htmlFor="tagColor">Tag Color</Label>
                            <div className="flex space-x-2">
                              <Input 
                                id="tagColor"
                                type="color" 
                                value={newTagColor} 
                                onChange={(e) => setNewTagColor(e.target.value)}
                                className="w-12 h-8 p-1"
                              />
                              <span className="flex-1 py-1">{newTagColor}</span>
                            </div>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Yes/No</SelectItem>
                        <SelectItem value="select">Single Choice</SelectItem>
                        <SelectItem value="multi-select">Multiple Choice</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(questionType === "select" || questionType === "multi-select") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Options</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkImport(!showBulkImport)}
                    >
                      {showBulkImport ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel Bulk Import
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4 mr-2" />
                          Bulk Import Options
                        </>
                      )}
                    </Button>
                  </div>

                  {showBulkImport ? (
                    <div className="space-y-4 p-4 border rounded-md bg-muted/10">
                      <FormDescription>
                        Paste options from Excel or text (one per line or comma-separated)
                      </FormDescription>
                      <Textarea
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        value={bulkOptionsText}
                        onChange={(e) => setBulkOptionsText(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button
                        type="button"
                        onClick={handleBulkImportOptions}
                        disabled={!bulkOptionsText.trim()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import Options
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add an option"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={addOption}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {form.watch("options")?.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md bg-background"
                      >
                        <span>{option}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {form.watch("options")?.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No options added yet
                      </p>
                    )}
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}
