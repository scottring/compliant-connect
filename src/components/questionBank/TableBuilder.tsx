import React, { useState } from "react";
// Remove react-hook-form import
import { Plus, Trash, ChevronDown, ChevronUp, FileDown, Upload, X } from "lucide-react";
import { FormLabel, FormDescription } from "@/components/ui/form"; // Keep FormLabel/Desc for styling consistency
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
// Import types from @/types
import { TableColumn, NestedTableColumns, ColumnType } from "@/types";

// Update props interface
interface TableBuilderProps {
  columns: TableColumn[];
  onChange: (columns: TableColumn[]) => void;
}

export function TableBuilder({ columns, onChange }: TableBuilderProps) {
  const [newColumnOption, setNewColumnOption] = useState("");
  const [expandedNested, setExpandedNested] = useState<number | null>(null);
  const [bulkOptionsText, setBulkOptionsText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState<{column: number, nested?: number} | null>(null);

  // Use the 'columns' prop instead of form.watch
  // const tableColumns = form.watch("tableColumns") || [];

  const addTableColumn = () => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = columns || [];
    onChange([
      ...currentColumns,
      { name: "", type: "text", nested: false, nestedColumns: [] }, // Ensure nestedColumns is initialized
    ]);
  };

  const removeTableColumn = (index: number) => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = columns || [];
    onChange(
      currentColumns.filter((_, i) => i !== index));
  };

  const updateColumnField = (
    index: number,
    field: keyof TableColumn,
    value: any
  ) => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = [...(columns || [])];
    currentColumns[index] = {
      ...currentColumns[index],
      [field]: value,
    };
    onChange(currentColumns);
  };

  const toggleNested = (index: number) => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = [...(columns || [])];
    const isNested = currentColumns[index]?.nested || false;

    currentColumns[index] = {
      ...currentColumns[index],
      nested: !isNested,
      // Initialize nestedColumns if turning nested on, keep existing if turning off (or handle differently if needed)
      nestedColumns: !isNested ? [] : currentColumns[index].nestedColumns || [],
    };

    onChange(currentColumns);

    // Keep local state for UI expansion
    setExpandedNested(expandedNested === index ? null : index);
  };

  const addNestedColumn = (columnIndex: number) => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = [...(columns || [])];
    const currentNestedColumns = currentColumns[columnIndex].nestedColumns || [];

    currentColumns[columnIndex] = {
      ...currentColumns[columnIndex],
      nestedColumns: [
        ...currentNestedColumns,
        { name: "", type: "text" }, // Default nested column
      ],
    };

    onChange(currentColumns);
  };

  const removeNestedColumn = (columnIndex: number, nestedIndex: number) => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = [...(columns || [])];
    const currentNestedColumns = [...(currentColumns[columnIndex].nestedColumns || [])];

    currentColumns[columnIndex] = {
      ...currentColumns[columnIndex],
      nestedColumns: currentNestedColumns.filter((_, i) => i !== nestedIndex),
    };

    onChange(currentColumns);
  };

  const updateNestedColumnField = (
    columnIndex: number,
    nestedIndex: number,
    field: keyof NestedTableColumns,
    value: any
  ) => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = [...(columns || [])];
    const currentNestedColumns = [...(currentColumns[columnIndex].nestedColumns || [])];

    currentNestedColumns[nestedIndex] = {
      ...currentNestedColumns[nestedIndex],
      [field]: value,
    };
    
    currentColumns[columnIndex] = {
      ...currentColumns[columnIndex],
      nestedColumns: currentNestedColumns,
    };

    onChange(currentColumns);
  };

  const handleBulkImportOptions = (columnIndex: number, isNested = false, nestedIndex?: number) => {
    if (bulkOptionsText.trim()) {
      const newOptions = bulkOptionsText
        .split(/[\n,]/)
        .map(option => option.trim())
        .filter(option => option !== "");

      // Use 'columns' prop and call 'onChange'
      const currentColumns = [...(columns || [])];

      if (isNested && nestedIndex !== undefined) {
        const currentNestedColumns = [...(currentColumns[columnIndex].nestedColumns || [])];
        const currentOptions = currentNestedColumns[nestedIndex].options || [];
        
        currentNestedColumns[nestedIndex] = {
          ...currentNestedColumns[nestedIndex],
          options: [...currentOptions, ...newOptions],
        };
        
        currentColumns[columnIndex] = {
          ...currentColumns[columnIndex],
          nestedColumns: currentNestedColumns,
        };
      } else {
        const currentOptions = currentColumns[columnIndex].options || [];
        
        currentColumns[columnIndex] = {
          ...currentColumns[columnIndex],
          options: [...currentOptions, ...newOptions],
        };
      }

      onChange(currentColumns);
      setBulkOptionsText("");
      setShowBulkImport(null); // Reset bulk import UI state
    }
  };

  const addColumnOption = (columnIndex: number, isNested = false, nestedIndex?: number) => {
    if (newColumnOption.trim()) {
      // Use 'columns' prop and call 'onChange'
      const currentColumns = [...(columns || [])];

      if (isNested && nestedIndex !== undefined) {
        const currentNestedColumns = [...(currentColumns[columnIndex].nestedColumns || [])];
        const currentOptions = currentNestedColumns[nestedIndex].options || [];
        
        currentNestedColumns[nestedIndex] = {
          ...currentNestedColumns[nestedIndex],
          options: [...currentOptions, newColumnOption.trim()],
        };
        
        currentColumns[columnIndex] = {
          ...currentColumns[columnIndex],
          nestedColumns: currentNestedColumns,
        };
      } else {
        const currentOptions = currentColumns[columnIndex].options || [];
        
        currentColumns[columnIndex] = {
          ...currentColumns[columnIndex],
          options: [...currentOptions, newColumnOption.trim()],
        };
      }

      onChange(currentColumns);
      setNewColumnOption(""); // Reset input field
    }
  };

  const removeColumnOption = (
    columnIndex: number, 
    optionIndex: number, 
    isNested = false, 
    nestedIndex?: number
  ) => {
    // Use 'columns' prop and call 'onChange'
    const currentColumns = [...(columns || [])];

    if (isNested && nestedIndex !== undefined) {
      const currentNestedColumns = [...(currentColumns[columnIndex].nestedColumns || [])];
      const currentOptions = [...(currentNestedColumns[nestedIndex].options || [])];
      
      currentNestedColumns[nestedIndex] = {
        ...currentNestedColumns[nestedIndex],
        options: currentOptions.filter((_, i) => i !== optionIndex),
      };
      
      currentColumns[columnIndex] = {
        ...currentColumns[columnIndex],
        nestedColumns: currentNestedColumns,
      };
    } else {
      const currentOptions = [...(currentColumns[columnIndex].options || [])];
      
      currentColumns[columnIndex] = {
        ...currentColumns[columnIndex],
        options: currentOptions.filter((_, i) => i !== optionIndex),
      };
    }

    onChange(currentColumns);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel>Table Columns</FormLabel>
        <Button type="button" onClick={addTableColumn} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Column
        </Button>
      </div>
      
      <FormDescription>
        Configure the columns for this table. You can add nested tables by checking the "Has Nested Data" option.
      </FormDescription>

      {/* Use 'columns' prop for mapping */}
      {columns.length > 0 ? (
        <div className="space-y-4">
          {columns.map((column: TableColumn, index: number) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-muted/50 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">{column.name || `Column ${index + 1}`}</CardTitle>
                  <Button 
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removeTableColumn(index)}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FormLabel className="text-sm" htmlFor={`column-${index}-name`}>Column Name</FormLabel>
                    <Input
                      id={`column-${index}-name`}
                      placeholder="e.g., Product Name"
                      value={column.name}
                      onChange={(e) => updateColumnField(index, "name", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <FormLabel className="text-sm" htmlFor={`column-${index}-type`}>Data Type</FormLabel>
                    <Select
                      value={column.type}
                      onValueChange={(value) => updateColumnField(index, "type", value)}
                    >
                      <SelectTrigger id={`column-${index}-type`}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Yes/No</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {column.type === "select" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm">Options</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (showBulkImport && showBulkImport.column === index && !showBulkImport.nested) {
                            setShowBulkImport(null);
                          } else {
                            setShowBulkImport({ column: index });
                            setBulkOptionsText("");
                          }
                        }}
                      >
                        {(showBulkImport && showBulkImport.column === index && !showBulkImport.nested) ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <FileDown className="h-4 w-4 mr-2" />
                            Bulk Import
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {(showBulkImport && showBulkImport.column === index && !showBulkImport.nested) ? (
                      <div className="space-y-3 p-3 border rounded-md bg-muted/10">
                        <FormDescription className="text-xs">
                          Paste options from Excel or text (one per line or comma-separated)
                        </FormDescription>
                        <Textarea
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          value={bulkOptionsText}
                          onChange={(e) => setBulkOptionsText(e.target.value)}
                          className="min-h-[80px] text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleBulkImportOptions(index)}
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
                          value={newColumnOption}
                          onChange={(e) => setNewColumnOption(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => addColumnOption(index)}
                          variant="outline"
                          size="sm"
                        >
                          Add
                        </Button>
                      </div>
                    )}
                    
                    <div className="mt-2 space-y-1">
                      {(column.options || []).map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center justify-between p-2 border rounded-md bg-background"
                        >
                          <span className="text-sm">{option}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColumnOption(index, optionIndex)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`column-${index}-nested`}
                    checked={column.nested}
                    onCheckedChange={() => toggleNested(index)}
                  />
                  <label 
                    htmlFor={`column-${index}-nested`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Has Nested Data (BOM-like table)
                  </label>
                </div>
                
                {column.nested && (
                  <div className="pl-4 border-l-2 border-primary/20 mt-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm">Nested Columns</FormLabel>
                      <Button 
                        type="button" 
                        onClick={() => addNestedColumn(index)} 
                        variant="outline" 
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Nested Column
                      </Button>
                    </div>
                    
                    {(column.nestedColumns || []).length > 0 ? (
                      <div className="space-y-3">
                        {(column.nestedColumns || []).map((nestedColumn, nestedIndex) => (
                          <Card key={nestedIndex} className="border-dashed">
                            <CardContent className="pt-4 pb-2 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
                                  {nestedColumn.name || `Nested Column ${nestedIndex + 1}`}
                                </div>
                                <Button 
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => removeNestedColumn(index, nestedIndex)}
                                  className="h-7 w-7 text-destructive"
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <FormLabel className="text-xs" htmlFor={`nested-${index}-${nestedIndex}-name`}>Column Name</FormLabel>
                                  <Input
                                    id={`nested-${index}-${nestedIndex}-name`}
                                    placeholder="e.g., Material Name"
                                    value={nestedColumn.name}
                                    onChange={(e) => updateNestedColumnField(index, nestedIndex, "name", e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                
                                <div>
                                  <FormLabel className="text-xs" htmlFor={`nested-${index}-${nestedIndex}-type`}>Data Type</FormLabel>
                                  <Select
                                    value={nestedColumn.type}
                                    onValueChange={(value) => updateNestedColumnField(index, nestedIndex, "type", value)}
                                  >
                                    <SelectTrigger id={`nested-${index}-${nestedIndex}-type`} className="h-8 text-sm">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="boolean">Yes/No</SelectItem>
                                      <SelectItem value="select">Dropdown</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              {nestedColumn.type === "select" && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs">Options</FormLabel>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7"
                                      onClick={() => {
                                        if (showBulkImport && 
                                            showBulkImport.column === index && 
                                            showBulkImport.nested === nestedIndex) {
                                          setShowBulkImport(null);
                                        } else {
                                          setShowBulkImport({ column: index, nested: nestedIndex });
                                          setBulkOptionsText("");
                                        }
                                      }}
                                    >
                                      {(showBulkImport && 
                                        showBulkImport.column === index && 
                                        showBulkImport.nested === nestedIndex) ? (
                                        <>
                                          <X className="h-3 w-3 mr-1" />
                                          Cancel
                                        </>
                                      ) : (
                                        <>
                                          <FileDown className="h-3 w-3 mr-1" />
                                          Bulk Import
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  
                                  {(showBulkImport && 
                                    showBulkImport.column === index && 
                                    showBulkImport.nested === nestedIndex) ? (
                                    <div className="space-y-2 p-2 border rounded-md bg-muted/10">
                                      <FormDescription className="text-xs">
                                        Paste options (one per line or comma-separated)
                                      </FormDescription>
                                      <Textarea
                                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                                        value={bulkOptionsText}
                                        onChange={(e) => setBulkOptionsText(e.target.value)}
                                        className="min-h-[60px] text-xs"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleBulkImportOptions(index, true, nestedIndex)}
                                        disabled={!bulkOptionsText.trim()}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Import
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex space-x-2">
                                      <Input
                                        placeholder="Add an option"
                                        value={newColumnOption}
                                        onChange={(e) => setNewColumnOption(e.target.value)}
                                        className="flex-1 h-8 text-sm"
                                      />
                                      <Button
                                        type="button"
                                        onClick={() => addColumnOption(index, true, nestedIndex)}
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {(column.nestedColumns || []).length > 0 ? (
                                    <div className="mt-2 space-y-1">
                                      {(nestedColumn.options || []).map((option, optionIndex) => (
                                        <div
                                          key={optionIndex}
                                          className="flex items-center justify-between p-1.5 border rounded-md bg-background"
                                        >
                                          <span className="text-xs">{option}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6"
                                            onClick={() => removeColumnOption(index, optionIndex, true, nestedIndex)}
                                          >
                                            <Trash className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No nested columns added yet. Click "Add Nested Column" to create one.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-md p-6 text-center text-muted-foreground">
          <p>No columns added yet</p>
          <Button 
            type="button" 
            onClick={addTableColumn} 
            variant="outline" 
            size="sm"
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Column
          </Button>
        </div>
      )}
    </div>
  );
}
