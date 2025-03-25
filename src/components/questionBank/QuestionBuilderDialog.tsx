import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApp } from "@/context/AppContext";
import { Question, Tag, Section, Subsection, ColumnType, TableColumn } from "@/types";
import { X, Plus, Trash, Tag as TagIcon, FileDown, Upload } from "lucide-react";
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
import { SectionSelector } from "./SectionSelector";
import {
  TableBuilder,
  NestedTableColumns
} from "@/components/questionBank/TableBuilder";

const formSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  required: z.boolean().default(true),
  type: z.enum(["text", "number", "boolean", "select", "multi-select", "table", "file"]),
  options: z.array(z.string()).optional(),
  tableColumns: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["text", "number", "boolean", "select", "multi-select"]),
      options: z.array(z.string()).optional(),
      nested: z.boolean().default(false),
      nestedColumns: z.array(
        z.object({
          name: z.string(),
          type: z.enum(["text", "number", "boolean", "select", "multi-select"]),
          options: z.array(z.string()).optional(),
        })
      ).optional(),
    })
  ).optional(),
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
    sections, 
    subsections, 
    addQuestion, 
    updateQuestion, 
    addSection, 
    addSubsection, 
    updateSection, 
    updateSubsection, 
    deleteSection, 
    deleteSubsection,
    addTag
  } = useApp();
  
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newOption, setNewOption] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(undefined);
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string | undefined>(undefined);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6"); // Default blue color
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [bulkOptionsText, setBulkOptionsText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);

  const editingQuestion = questionId
    ? questions.find((q) => q.id === questionId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
      required: true,
      type: "text",
      options: [],
      tableColumns: [],
    },
  });

  const questionType = form.watch("type");

  useEffect(() => {
    if (editingQuestion) {
      form.reset({
        text: editingQuestion.text,
        required: editingQuestion.required,
        type: editingQuestion.type,
        options: editingQuestion.options || [],
        tableColumns: editingQuestion.tableColumns || [],
      });
      setSelectedTags(editingQuestion.tags);
      setSelectedSectionId(editingQuestion.sectionId);
      setSelectedSubsectionId(editingQuestion.subsectionId);
    } else {
      form.reset({
        text: "",
        required: true,
        type: "text",
        options: [],
        tableColumns: [],
      });
      setSelectedTags([]);
      setSelectedSectionId(undefined);
      setSelectedSubsectionId(undefined);
    }
  }, [editingQuestion, form]);

  const toggleTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        name: newTagName.trim(),
        color: newTagColor,
      };
      
      addTag(newTag);
      setNewTagName("");
      setIsTagPopoverOpen(false);
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

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setSelectedSubsectionId(undefined); // Reset subsection when section changes
  };

  const handleSubsectionChange = (subsectionId: string) => {
    setSelectedSubsectionId(subsectionId);
  };

  const calculateQuestionOrder = () => {
    if (!selectedSectionId) return 1;
    
    const questionsInSubsection = questions.filter(
      q => q.subsectionId === selectedSubsectionId
    );
    
    return questionsInSubsection.length + 1;
  };

  const getQuestionIdentifier = () => {
    if (!selectedSectionId) return "";
    
    const section = sections.find(s => s.id === selectedSectionId);
    if (!section) return "";
    
    if (!selectedSubsectionId) {
      return `${section.order}.`;
    }
    
    const subsection = subsections.find(s => s.id === selectedSubsectionId);
    if (!subsection) return `${section.order}.`;
    
    const order = calculateQuestionOrder();
    return `${section.order}.${subsection.order}.${order}`;
  };

  const onSubmit = (values: FormValues) => {
    const questionData: Omit<Question, "id"> = {
      text: values.text,
      required: values.required,
      type: values.type,
      tags: selectedTags,
      sectionId: selectedSectionId,
      subsectionId: selectedSubsectionId,
      order: calculateQuestionOrder(),
    };

    if (values.type === "select" || values.type === "multi-select") {
      questionData.options = values.options;
    }

    if (values.type === "table" && values.tableColumns) {
      questionData.tableColumns = values.tableColumns as TableColumn[];
    }

    if (editingQuestion) {
      updateQuestion({ ...questionData, id: editingQuestion.id });
    } else {
      addQuestion(questionData);
    }

    onClose();
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
            <SectionSelector
              sections={sections}
              subsections={subsections}
              selectedSectionId={selectedSectionId}
              selectedSubsectionId={selectedSubsectionId}
              onSectionChange={handleSectionChange}
              onSubsectionChange={handleSubsectionChange}
              onAddSection={addSection}
              onAddSubsection={addSubsection}
              onUpdateSection={updateSection}
              onUpdateSubsection={updateSubsection}
              onDeleteSection={deleteSection}
              onDeleteSubsection={deleteSubsection}
            />

            {selectedSectionId && (
              <div className="mb-4">
                <Label className="text-sm text-muted-foreground">
                  Question Identifier: <span className="font-bold">{getQuestionIdentifier()}</span>
                </Label>
              </div>
            )}

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your question here..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="table">Table</SelectItem>
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

            {questionType === "table" && (
              <TableBuilder
                form={form}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editingQuestion ? "Update Question" : "Create Question"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
