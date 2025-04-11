import React, { useEffect, useState } from "react";
import { Question, SupplierResponse, Comment, TableColumn } from "../../types/index"; // Explicit relative path
import { Database } from "../../types/supabase"; // Import Database type
import { DBQuestion } from "@/hooks/use-question-bank";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { ResponseStatus } from '@/types/pir'; // Import ResponseStatus
import { toast } from 'sonner'; // Import toast
// TODO: Import Supabase client hook, e.g., import { useSupabaseClient } from '@supabase/auth-helpers-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TagBadge from "@/components/tags/TagBadge";
import CommentsThread from "@/components/comments/CommentsThread";
import { Button } from "@/components/ui/button";
import { MessageCircle, Flag, AlertCircle, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface QuestionItemProps {
  question: Question | DBQuestion;
  answer?: SupplierResponse;
  pirId: string; // Add pirId prop
  onAnswerUpdate: (value: string | boolean | number | string[] | Record<string, string>[]) => void;
  onAddComment: (text: string) => void;
  isReadOnly?: boolean;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
  question, 
  answer, 
  pirId, // Destructure the new pirId prop
  onAnswerUpdate,
  onAddComment,
  isReadOnly = false
}) => {
  // Log the received answer prop and its comments
  useEffect(() => {
    console.log(`QuestionItem (${question.id}): Received answer prop:`, answer);
    console.log(`QuestionItem (${question.id}): Comments in prop:`, answer?.comments);
  }, [answer, question.id]);
  const [commentsOpen, setCommentsOpen] = React.useState(false); // Reset to initially closed
  const [debouncedValue, setDebouncedValue] = useState<string | number | boolean | string[] | Record<string, string>[] | undefined>(answer?.value as string | number | boolean | string[] | Record<string, string>[] | undefined);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [feedbackText, setFeedbackText] = useState(""); // State for the new feedback input
  // --- State for component_material_list type ---
  type ComponentData = Database['public']['Tables']['pir_response_components']['Row'] & {
    materials: Database['public']['Tables']['pir_response_component_materials']['Row'][];
  };
  const [componentMaterialData, setComponentMaterialData] = useState<ComponentData[]>([]);
  const [isLoadingComponentData, setIsLoadingComponentData] = useState(false);
  const [errorLoadingComponentData, setErrorLoadingComponentData] = useState<string | null>(null);
  // TODO: Get Supabase client instance, e.g., const supabase = useSupabaseClient<Database>();
  const supabase = useSupabaseClient<Database>();

  // --- Effect to fetch data for component_material_list ---
  useEffect(() => {
    if (question.type === 'component_material_list' && answer?.id && supabase) {
      const fetchData = async () => {
        setIsLoadingComponentData(true);
        setErrorLoadingComponentData(null);
        console.log(`Fetching component data for response ID: ${answer.id}`);

        // --- Placeholder Fetch Logic ---
        // Replace with actual Supabase calls
        try {
          // 1. Fetch components for this response
          const { data: components, error: componentsError } = await supabase
            .from('pir_response_components')
            .select('*')
            .eq('pir_response_id', answer.id)
            .order('order_index');
          if (componentsError) throw componentsError;
          if (!components) {
            console.warn(`No components found for response ID: ${answer.id}`);
            setComponentMaterialData([]);
            setIsLoadingComponentData(false);
            return; // Exit early if no components
          }

          // 2. Fetch materials for each component
          const dataWithMaterials: ComponentData[] = [];
          for (const comp of components) {
            const { data: materials, error: materialsError } = await supabase
              .from('pir_response_component_materials')
              .select('*')
              .eq('component_id', comp.id)
              .order('order_index');
            if (materialsError) throw materialsError;

            dataWithMaterials.push({ ...comp, materials: materials || [] });
          }

          console.log("Fetched data:", dataWithMaterials);
          setComponentMaterialData(dataWithMaterials);

        } catch (error: any) {
          console.error("Error fetching component/material data:", error);
          setErrorLoadingComponentData(error.message || "Failed to load data");
          setComponentMaterialData([]); // Clear data on error
        } finally {
          setIsLoadingComponentData(false);
        }
        // --- End Placeholder Fetch Logic ---
      };

      fetchData();
    } else {
      // Clear data if not the correct type or no answer ID
      setComponentMaterialData([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.type, answer?.id, supabase]); // Dependency: Supabase client instance


  const getSchema = () => {
    switch (question.type) {
      case "text":
        return z.string().optional();
      case "number":
        return z.number().optional();
      case "boolean":
        return z.boolean().optional();
      case "single_select": // Use correct enum value
        return z.string().optional();
      case "multi_select": // Use correct enum value
        return z.array(z.string()).optional();
      case "file":
        return z.string().optional();
      case "list_table": // Add this case
        // Assuming the value is an array of objects (rows)
        // where keys are column headers (strings) and values are strings
        return z.array(z.record(z.string())).optional();
      default:
        return z.string().optional();
    }
  };
  
  const schema = z.object({
    answer: getSchema(),
  });
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      answer: answer?.value as string | number | boolean | string[] | undefined,
    },
  });

  useEffect(() => {
    if (answer?.value !== undefined) {
      form.setValue("answer", answer.value as string | number | boolean | string[] | undefined);
      setDebouncedValue(answer.value as string | number | boolean | string[] | undefined);
    }
  }, [answer, form]);
  
  const onSubmit = (data: z.infer<typeof schema>) => {
    if (data.answer !== undefined && !isReadOnly) {
      onAnswerUpdate(data.answer);
    }
  };

  const handleValueChange = (value: string | number | boolean | string[] | Record<string, string>[]) => {
    if (isReadOnly) return; // Don't update if in read-only mode
    
    form.setValue("answer", value);

    // Clear any existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set a new timeout to save after 800ms of no typing
    const timeout = setTimeout(() => {
      if (debouncedValue !== value) {
        setDebouncedValue(value);
        onAnswerUpdate(value);
      }
    }, 800);
    
    setSaveTimeout(timeout);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Check if this answer has been flagged
  const hasFlags = answer?.flags && answer.flags.length > 0;
  
  // Get the most recent flag
  const latestFlag = hasFlags
    ? answer?.flags?.reduce((latest, current) =>
        latest.created_at! > current.created_at! ? latest : current // Use created_at and add non-null assertion
      )
    : null;

  // Render the appropriate input based on question type
  const renderFormControl = () => {
    switch (question.type) {
      case "text":
        return (
          <Input 
            value={form.watch("answer") as string || ""} 
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Type here..."
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        );
      
      case "number":
        return (
          <Input 
            type="number" 
            value={form.watch("answer") as number || ""} 
            onChange={(e) => handleValueChange(Number(e.target.value))}
            placeholder="Enter a number..."
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        );
      
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id={`question-${question.id}`} 
              checked={form.watch("answer") as boolean || false} 
              onCheckedChange={handleValueChange}
              disabled={isReadOnly}
            />
            <label 
              htmlFor={`question-${question.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Yes
            </label>
          </div>
        );

      case "single_select": // Use correct enum value
        return (
          <Select
            value={form.watch("answer") as string || ""}
            onValueChange={handleValueChange}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select": // This one was already correct
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox 
                  id={`question-${question.id}-${option}`} 
                  checked={(form.watch("answer") as string[] || []).includes(option)} 
                  onCheckedChange={(checked) => {
                    const currentValues = form.watch("answer") as string[] || [];
                    if (checked) {
                      handleValueChange([...currentValues, option]);
                    } else {
                      handleValueChange(currentValues.filter(val => val !== option));
                    }
                  }}
                  disabled={isReadOnly}
                />
                <label 
                  htmlFor={`question-${question.id}-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      
      case "file":
        return (
          <Button 
            type="button" 
            variant="outline" 
            className="w-full" 
            onClick={() => alert("File upload not implemented yet")}
            disabled={isReadOnly}
          >
            Start upload
          </Button>
        );

      case "list_table": {
        const columnDefs = (question.options || []) as TableColumn[]; // Use TableColumn type
        const tableData = (form.watch("answer") as Record<string, any>[] | undefined) || []; // Allow any type for nested data

        // --- Helper Functions for Nested Structure ---

        // Recursively get the total leaf columns count for colSpan
        const getLeafColumnCount = (column: TableColumn): number => {
          if (!column.nested || !column.nestedColumns || column.nestedColumns.length === 0) {
            return 1; // Base case: a non-nested column or empty nested columns counts as 1
          }
          // Recursive case: sum the leaf counts of nested columns
          return column.nestedColumns.reduce((sum, nestedCol) => sum + getLeafColumnCount(nestedCol as TableColumn), 0);
        };

        // Get the maximum depth of nesting
        const getMaxDepth = (columns: TableColumn[], currentDepth = 1): number => {
          let maxDepth = currentDepth;
          for (const column of columns) {
            if (column.nested && column.nestedColumns && column.nestedColumns.length > 0) {
              maxDepth = Math.max(maxDepth, getMaxDepth(column.nestedColumns as TableColumn[], currentDepth + 1));
            }
          }
          return maxDepth;
        };
        const maxDepth = getMaxDepth(columnDefs);

        // Generate header rows recursively
        const renderHeaderRows = () => {
          const rows: React.ReactNode[][] = Array.from({ length: maxDepth }, () => []);
          
          const buildRows = (columns: TableColumn[], currentDepth: number) => {
            columns.forEach((col) => {
              const colSpan = getLeafColumnCount(col);
              const rowSpan = (!col.nested || !col.nestedColumns || col.nestedColumns.length === 0) ? maxDepth - currentDepth + 1 : 1;
              
              rows[currentDepth - 1].push(
                <TableHead key={col.name} colSpan={colSpan} rowSpan={rowSpan} className={rowSpan > 1 ? "align-bottom" : ""}>
                  {col.name}
                </TableHead>
              );

              if (col.nested && col.nestedColumns && col.nestedColumns.length > 0) {
                buildRows(col.nestedColumns as TableColumn[], currentDepth + 1);
              }
            });
          };

          buildRows(columnDefs, 1);

          // Add empty header cell for delete button if not read-only
          if (!isReadOnly) {
             rows[0].push(<TableHead key="delete-header" rowSpan={maxDepth} className="w-[50px] align-bottom"></TableHead>);
          }


          return rows.map((rowContent, index) => <TableRow key={`header-row-${index}`}>{rowContent}</TableRow>);
        };

        // Generate cell inputs recursively, handling different column types
        const renderCellInputs = (columns: TableColumn[], rowData: Record<string, any>, rowIndex: number, pathPrefix: string[] = []): React.ReactNode[] => {
          let cells: React.ReactNode[] = [];
          columns.forEach((col) => {
            const currentPath = [...pathPrefix, col.name];
            const cellKey = currentPath.join('-');
            const cellValue = currentPath.reduce((acc, key) => acc?.[key], rowData); // Get potentially nested value

            if (col.nested && col.nestedColumns && col.nestedColumns.length > 0) {
              // Recursively render nested cells
              cells = cells.concat(renderCellInputs(col.nestedColumns as TableColumn[], rowData, rowIndex, currentPath));
            } else {
              // Render leaf cell input based on column type
              let inputControl: React.ReactNode;
              switch (col.type) {
                case "number":
                  inputControl = (
                    <Input
                      type="number"
                      value={cellValue ?? ""}
                      onChange={(e) => handleCellChange(rowIndex, currentPath, Number(e.target.value))}
                      disabled={isReadOnly} readOnly={isReadOnly} placeholder={`Enter ${col.name}...`} className="min-w-[100px]"
                    />
                  );
                  break;
                case "boolean":
                  // Ensure unique ID for checkbox label association
                  const checkboxId = `cell-${rowIndex}-${cellKey}`;
                  inputControl = (
                    <div className="flex items-center justify-center h-full"> {/* Center checkbox */}
                      <Checkbox
                        id={checkboxId}
                        checked={!!cellValue}
                        onCheckedChange={(checked) => handleCellChange(rowIndex, currentPath, !!checked)}
                        disabled={isReadOnly}
                        aria-labelledby={`${checkboxId}-label`} // For accessibility if needed
                      />
                      {/* Optional: Add a hidden label for screen readers if needed */}
                      {/* <label id={`${checkboxId}-label`} className="sr-only">{col.name}</label> */}
                    </div>
                  );
                  break;
                case "select":
                  inputControl = (
                    <Select
                      value={cellValue ?? ""}
                      onValueChange={(value) => handleCellChange(rowIndex, currentPath, value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="min-w-[120px]">
                        <SelectValue placeholder={`Select ${col.name}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {col.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                  break;
                case "multi-select":
                  // TODO: Implement a proper multi-select component for table cells
                  // For now, maybe display as comma-separated string or use a placeholder
                  inputControl = (
                     <Input
                       value={Array.isArray(cellValue) ? cellValue.join(', ') : (cellValue ?? "")}
                       // onChange might need complex handling for multi-select
                       onChange={(e) => handleCellChange(rowIndex, currentPath, e.target.value.split(',').map(s => s.trim()))} // Basic split, needs improvement
                       disabled={isReadOnly} readOnly={isReadOnly} placeholder={`Enter ${col.name} (comma-sep)...`} className="min-w-[150px]"
                     />
                   );
                  // Placeholder for a real multi-select component:
                  // inputControl = <MultiSelectTableCellComponent value={cellValue} options={col.options} onChange={(value) => handleCellChange(rowIndex, currentPath, value)} disabled={isReadOnly} />;
                  break;
                case "text":
                default:
                  inputControl = (
                    <Input
                      value={cellValue ?? ""}
                      onChange={(e) => handleCellChange(rowIndex, currentPath, e.target.value)}
                      disabled={isReadOnly} readOnly={isReadOnly} placeholder={`Enter ${col.name}...`} className="min-w-[100px]"
                    />
                  );
              }

              cells.push(
                <TableCell key={cellKey} className="p-1"> {/* Reduced padding */}
                  {inputControl}
                </TableCell>
              );
            }
          });
          return cells;
        };
        
        // --- Updated Handlers ---

        // Updated handler to set nested values, accepting different types
        const handleCellChange = (rowIndex: number, path: string[], value: string | number | boolean | string[]) => {
           if (isReadOnly) return;

           // Use a function to safely update nested state
           const updateNestedState = (prevState: Record<string, any>[], rIndex: number, p: string[], val: any): Record<string, any>[] => {
             // Deep copy to avoid direct state mutation
             const newState = JSON.parse(JSON.stringify(prevState));

             // Ensure row exists
             if (!newState[rIndex]) {
               newState[rIndex] = {};
             }

             // Traverse the path to set the value
             let currentLevel = newState[rIndex];
             for (let i = 0; i < p.length - 1; i++) {
               const key = p[i];
               if (!currentLevel[key] || typeof currentLevel[key] !== 'object') {
                 currentLevel[key] = {}; // Create nested object if it doesn't exist
               }
               currentLevel = currentLevel[key];
             }

             // Set the final value
             currentLevel[p[p.length - 1]] = val;
             return newState;
           };

           // Get the current table data from the form
           const currentTableData = (form.watch("answer") as Record<string, any>[] | undefined) || [];
           const updatedData = updateNestedState(currentTableData, rowIndex, path, value);

           handleValueChange(updatedData); // Update the main form state
         };


        // Updated handler to add a row with nested structure
        const handleAddRow = () => {
          if (isReadOnly) return;

          // Recursively create default structure
          const createDefaultRow = (columns: TableColumn[]): Record<string, any> => {
            const row: Record<string, any> = {};
            columns.forEach(col => {
              if (col.nested && col.nestedColumns && col.nestedColumns.length > 0) {
                row[col.name] = createDefaultRow(col.nestedColumns as TableColumn[]);
              } else {
                row[col.name] = ""; // Default empty string for leaf nodes
              }
            });
            return row;
          };

          const newRow = createDefaultRow(columnDefs);
          handleValueChange([...tableData, newRow]);
        };

        // Delete row handler remains the same conceptually
        const handleDeleteRow = (rowIndex: number) => {
          if (isReadOnly) return;
          const newData = tableData.filter((_, index) => index !== rowIndex);
          handleValueChange(newData);
        };

        // --- Render Logic ---
        return (
          <div className="space-y-3 overflow-x-auto"> {/* Added overflow for potentially wide tables */}
            <Table>
              <TableHeader>
                {renderHeaderRows()}
              </TableHeader>
              <TableBody>
                {tableData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {renderCellInputs(columnDefs, row, rowIndex)}
                    {!isReadOnly && (
                       <TableCell className="text-right align-middle"> {/* Ensure button aligns */}
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon" // Make button smaller
                           onClick={() => handleDeleteRow(rowIndex)}
                           aria-label="Delete row"
                           className="h-8 w-8" // Adjust size
                         >
                           <Trash2 className="h-4 w-4 text-red-500" />
                         </Button>
                       </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isReadOnly && (
              <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
                Add Row
              </Button>
            )}
          </div>
        );
      } // End list_table case
case 'component_material_list': {
  // --- Define Headers based on the relational schema ---
  // These could potentially be made dynamic if needed later
  const headers = ["#", "Component", "Position", "Material", "Pct.", "Recyclable"];

  // --- Placeholder Handlers ---
  const handleComponentMaterialUpdate = async (componentIndex: number, materialIndex: number | null, field: string, value: any) => {
    if (!supabase || isReadOnly) return; // Ensure client exists and not read-only

    const component = componentMaterialData[componentIndex];
    if (!component) {
      console.error("Component not found at index:", componentIndex);
      return;
    }

    let tableName: 'pir_response_components' | 'pir_response_component_materials';
    let recordId: string;
    let updatePayload: Record<string, any> = { [field]: value };

    if (materialIndex === null) {
      // Updating a component field
      tableName = 'pir_response_components';
      recordId = component.id;
    } else {
      // Updating a material field
      const material = component.materials[materialIndex];
      if (!material) {
        console.error("Material not found at index:", materialIndex, "for component:", component.id);
        return;
      }
      tableName = 'pir_response_component_materials';
      recordId = material.id;
    }

    console.log(`Updating ${tableName} record ${recordId} with:`, updatePayload);

    try {
      const { error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq('id', recordId);

      if (error) {
        console.error(`Error updating ${tableName}:`, error);
        // TODO: Add user feedback (e.g., toast notification)
        return; // Don't update local state if DB update failed
      }

      // Optimistically update local state
      setComponentMaterialData(prevData => {
        const newData = [...prevData];
        const targetComponent = { ...newData[componentIndex] }; // Shallow copy component

        if (materialIndex === null) {
          // Update component field
          (targetComponent as any)[field] = value;
        } else {
          // Update material field
          const targetMaterials = [...targetComponent.materials]; // Shallow copy materials array
          const targetMaterial = { ...targetMaterials[materialIndex] }; // Shallow copy material
          (targetMaterial as any)[field] = value;
          targetMaterials[materialIndex] = targetMaterial;
          targetComponent.materials = targetMaterials;
        }
        newData[componentIndex] = targetComponent;
        return newData;
      });

    } catch (err) {
      console.error("Unexpected error during update:", err);
      // TODO: Add user feedback
    }
  };
  const handleAddMaterial = async (componentIndex: number) => {
    if (!supabase || isReadOnly || !answer?.id) return;

    const component = componentMaterialData[componentIndex];
    if (!component) {
      console.error("Component not found at index:", componentIndex);
      return;
    }

    // Determine the next order_index for the new material
    const nextOrderIndex = component.materials.length; // Simple append

    const newMaterialDefaults: Omit<Database['public']['Tables']['pir_response_component_materials']['Insert'], 'id' | 'created_at' | 'updated_at'> = {
      component_id: component.id,
      material_name: "New Material", // Default name
      percentage: 0, // Default percentage
      recyclable: null, // Default recyclable status
      order_index: nextOrderIndex,
    };

    console.log("Adding new material:", newMaterialDefaults);

    try {
      const { data: insertedMaterial, error } = await supabase
        .from('pir_response_component_materials')
        .insert(newMaterialDefaults)
        .select() // Select the newly inserted row to get its ID
        .single(); // Expecting a single row back

      if (error) {
        console.error("Error adding material:", error);
        // TODO: Add user feedback
        return;
      }

      if (!insertedMaterial) {
        console.error("Insert operation did not return the new material record.");
        // TODO: Add user feedback
        return;
      }

      console.log("Successfully added material:", insertedMaterial);

      // Optimistically update local state
      setComponentMaterialData(prevData => {
        const newData = [...prevData];
        const targetComponent = { ...newData[componentIndex] };
        const targetMaterials = [...targetComponent.materials, insertedMaterial]; // Add the new material
        targetComponent.materials = targetMaterials;
        newData[componentIndex] = targetComponent;
        return newData;
      });

    } catch (err) {
      console.error("Unexpected error during material addition:", err);
      // TODO: Add user feedback
    }
  };
  const handleAddComponent = async () => {
    if (!supabase || isReadOnly || !pirId || !question.id) {
        console.error("Missing supabase client, PIR ID, or Question ID");
        return; // Guard against missing essential IDs passed via props or context
    }

    let responseId = answer?.id;

    // 1. Ensure a pir_responses record exists for this question
    if (!responseId) {
      console.log("No existing response record found, creating one...");
      const { data: newResponse, error: responseError } = await supabase
        .from('pir_responses')
        .insert({
          pir_id: pirId, // Assuming pirId is available in scope (needs to be passed down or fetched)
          question_id: question.id,
          answer: {}, // Use empty JSON object instead of null to satisfy NOT NULL constraint
          status: 'draft' as ResponseStatus,
        })
        .select('id')
        .single();

      if (responseError || !newResponse) {
        console.error("Error creating base response record:", responseError);
        toast.error("Failed to initialize response before adding component.");
        return;
      }
      responseId = newResponse.id;
      console.log("Created base response record with ID:", responseId);
      // TODO: Consider updating the parent state or refetching to make this new 'answer' available
      // For now, we'll just use the responseId locally for the component insert.
    }

    // 2. Now add the component, linked to the responseId
    const nextOrderIndex = componentMaterialData.length; // Simple append
    const newComponentDefaults: Omit<Database['public']['Tables']['pir_response_components']['Insert'], 'id' | 'created_at' | 'updated_at'> = {
      pir_response_id: responseId, // Use the obtained responseId
      component_name: "New Component", // Default name
      position: null, // Default position
      order_index: nextOrderIndex,
    };

    console.log("Adding new component:", newComponentDefaults);

    try {
      const { data: insertedComponent, error } = await supabase
        .from('pir_response_components')
        .insert(newComponentDefaults)
        .select() // Select the newly inserted row to get its ID
        .single(); // Expecting a single row back

      if (error) {
        console.error("Error adding component:", error);
        // TODO: Add user feedback
        return;
      }

      if (!insertedComponent) {
        console.error("Insert operation did not return the new component record.");
        // TODO: Add user feedback
        return;
      }

      console.log("Successfully added component:", insertedComponent);

      // Optimistically update local state, adding the new component with an empty materials array
      const newComponentWithMaterials: ComponentData = {
        ...insertedComponent,
        materials: [],
      };

      setComponentMaterialData(prevData => [...prevData, newComponentWithMaterials]);

    } catch (err) {
      console.error("Unexpected error during component addition:", err);
      // TODO: Add user feedback
    }
      // TODO: Consider invalidating the parent query ('pirDetails') if the base response was created
  };
   const handleDeleteMaterial = async (componentIndex: number, materialId: string) => {
    if (!supabase || isReadOnly) return;

    console.log("Deleting Material:", { componentIndex, materialId });

    try {
      const { error } = await supabase
        .from('pir_response_component_materials')
        .delete()
        .eq('id', materialId);

      if (error) {
        console.error("Error deleting material:", error);
        // TODO: Add user feedback
        return;
      }

      console.log("Successfully deleted material:", materialId);

      // Optimistically update local state
      setComponentMaterialData(prevData => {
        const newData = [...prevData];
        const targetComponent = { ...newData[componentIndex] };
        // Filter out the deleted material
        targetComponent.materials = targetComponent.materials.filter(mat => mat.id !== materialId);
        newData[componentIndex] = targetComponent;
        return newData;
      });

    } catch (err) {
      console.error("Unexpected error during material deletion:", err);
      // TODO: Add user feedback
    }
   };
   const handleDeleteComponent = async (componentId: string) => {
    if (!supabase || isReadOnly) return;

    console.log("Deleting Component:", componentId);

    // Optional: Add a confirmation dialog here before deleting

    try {
      const { error } = await supabase
        .from('pir_response_components')
        .delete()
        .eq('id', componentId);

      if (error) {
        console.error("Error deleting component:", error);
        // TODO: Add user feedback (e.g., toast notification)
        // Consider if the error is due to foreign key constraints if cascade delete isn't set up
        return;
      }

      console.log("Successfully deleted component:", componentId);

      // Optimistically update local state
      setComponentMaterialData(prevData => prevData.filter(comp => comp.id !== componentId));

    } catch (err) {
      console.error("Unexpected error during component deletion:", err);
      // TODO: Add user feedback
    }
   };


  // --- Render Logic ---
  if (isLoadingComponentData) {
    return <div>Loading component data...</div>;
  }
  if (errorLoadingComponentData) {
    return <div className="text-red-600">Error: {errorLoadingComponentData}</div>;
  }

  let globalRowIndex = 0; // To keep track of the overall row number (#)

  return (
    <div className="space-y-3 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
            {!isReadOnly && <TableHead className="w-[100px]">Actions</TableHead>} {/* Actions */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {componentMaterialData.length === 0 && (
              <TableRow><TableCell colSpan={headers.length + (isReadOnly ? 0 : 1)} className="text-center text-muted-foreground">No components added yet.</TableCell></TableRow>
          )}
          {componentMaterialData.map((component, compIndex) => {
            globalRowIndex++; // Increment global index for each component group start
            const componentRowSpan = Math.max(1, component.materials.length);

            if (component.materials.length === 0) {
              // --- Render Row for Component with NO Materials ---
              return (
                <TableRow key={`comp-${component.id}-empty`}>
                  {/* Row Number */}
                  <TableCell className="align-top border-r">{globalRowIndex}</TableCell>
                  {/* Component Name */}
                  <TableCell className="align-top border-r">
                    <Input value={component.component_name || ''} onChange={(e) => handleComponentMaterialUpdate(compIndex, null, 'component_name', e.target.value)} disabled={isReadOnly} placeholder="Component Name" className="min-w-[150px]" />
                  </TableCell>
                  {/* Position */}
                  <TableCell className="align-top border-r">
                    <Input value={component.position || ''} onChange={(e) => handleComponentMaterialUpdate(compIndex, null, 'position', e.target.value)} disabled={isReadOnly} placeholder="Position" className="min-w-[100px]" />
                  </TableCell>
                  {/* Empty Cells for Material Columns */}
                  <TableCell className="align-top border-r"></TableCell> {/* Material Name */}
                  <TableCell className="align-top border-r"></TableCell> {/* Percentage */}
                  <TableCell className="align-top"></TableCell>          {/* Recyclable */}
                  {/* Actions Cell */}
                  {!isReadOnly && (
                    <TableCell className="align-middle border-t">
                      <div className="flex flex-col items-center space-y-1">
                        {/* Add Material Button */}
                        <Button variant="outline" size="sm" className="text-xs px-1 py-0.5 h-auto" onClick={() => handleAddMaterial(compIndex)}>+ Mat</Button>
                        {/* Delete Component Button */}
                        <Button variant="ghost" size="icon" className="h-6 w-6 mt-2" onClick={() => handleDeleteComponent(component.id)} aria-label="Delete Component">
                          <Trash2 className="h-4 w-4 text-red-700" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            } else {
              // --- Render Rows for Component WITH Materials (Existing Logic) ---
              let currentGlobalRow = globalRowIndex; // Capture starting global index for this group
              return component.materials.map((material, matIndex) => {
                const isFirstMaterialRow = matIndex === 0;
                if (!isFirstMaterialRow) globalRowIndex++; // Increment global index only for subsequent material rows

                return (
                  <TableRow key={material.id || `comp-${component.id}-mat-${matIndex}`}>
                    {/* Row Number */}
                    {isFirstMaterialRow && <TableCell rowSpan={componentRowSpan} className="align-top border-r">{currentGlobalRow}</TableCell>}
                    {/* Hidden cell for layout consistency might not be needed if row number logic is correct */}
                    {/* {!isFirstMaterialRow && <TableCell className="hidden border-r">{globalRowIndex}</TableCell>} */}

                    {/* Component Name (spans rows) */}
                    {isFirstMaterialRow && (
                      <TableCell rowSpan={componentRowSpan} className="align-top border-r">
                        <Input value={component.component_name || ''} onChange={(e) => handleComponentMaterialUpdate(compIndex, null, 'component_name', e.target.value)} disabled={isReadOnly} placeholder="Component Name" className="min-w-[150px]" />
                      </TableCell>
                    )}

                    {/* Position (spans rows) */}
                    {isFirstMaterialRow && (
                      <TableCell rowSpan={componentRowSpan} className="align-top border-r">
                        <Input value={component.position || ''} onChange={(e) => handleComponentMaterialUpdate(compIndex, null, 'position', e.target.value)} disabled={isReadOnly} placeholder="Position" className="min-w-[100px]" />
                      </TableCell>
                    )}

                    {/* Material Name */}
                    <TableCell className="align-top border-r">
                       <Input value={material.material_name || ''} onChange={(e) => handleComponentMaterialUpdate(compIndex, matIndex, 'material_name', e.target.value)} disabled={isReadOnly} placeholder="Material Name" className="min-w-[150px]" />
                    </TableCell>

                    {/* Percentage */}
                    <TableCell className="align-top border-r">
                       <Input type="number" value={material.percentage ?? ''} onChange={(e) => handleComponentMaterialUpdate(compIndex, matIndex, 'percentage', e.target.value === '' ? null : Number(e.target.value))} disabled={isReadOnly} placeholder="%" className="min-w-[60px]" />
                    </TableCell>

                    {/* Recyclable */}
                    <TableCell className="align-top">
                       <Input value={material.recyclable || ''} onChange={(e) => handleComponentMaterialUpdate(compIndex, matIndex, 'recyclable', e.target.value)} disabled={isReadOnly} placeholder="Recyclable?" className="min-w-[100px]" />
                    </TableCell>

                    {/* Actions Cell */}
                    {!isReadOnly && (
                      <TableCell className={`align-middle ${isFirstMaterialRow ? 'border-t' : ''}`}>
                        <div className="flex flex-col items-center space-y-1">
                            {/* Delete Material Button */}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteMaterial(compIndex, material.id)} aria-label="Delete Material">
                                <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                            {/* Add Material Button (only on last material row of component) */}
                            {matIndex === component.materials.length - 1 && (
                                <Button variant="outline" size="sm" className="text-xs px-1 py-0.5 h-auto" onClick={() => handleAddMaterial(compIndex)}>+ Mat</Button>
                            )}
                            {/* Delete Component Button (only on first material row) */}
                            {isFirstMaterialRow && (
                                 <Button variant="ghost" size="icon" className="h-6 w-6 mt-2" onClick={() => handleDeleteComponent(component.id)} aria-label="Delete Component">
                                     <Trash2 className="h-4 w-4 text-red-700" />
                                 </Button>
                            )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              });
            }
          })}
        </TableBody>
      </Table>
      {!isReadOnly && (
        <Button type="button" variant="outline" size="sm" onClick={handleAddComponent}>
          Add Component Group
        </Button>
      )}
    </div>
  );
} // End component_material_list case

default:
  // Ensure the default case handles the original 'answer' field if needed
  // This might need adjustment if 'component_material_list' shouldn't use the form's 'answer' field at all.
  return (
    <Input
      value={form.watch("answer") as string || ""}
      onChange={(e) => handleValueChange(e.target.value)}
      placeholder="Type here..."
      disabled={isReadOnly}
      readOnly={isReadOnly}
    />
  );
}
};

  
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-base">
            {question.hierarchical_number && <span className="mr-2 text-muted-foreground">{question.hierarchical_number}</span>}
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {question.description && (
            <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
          )}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {question.tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-secondary px-2 py-1 rounded capitalize">
            {question.type}
          </span>
          
          {hasFlags && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-red-500" 
            >
              <Flag className="h-4 w-4 mr-1" />
              {answer?.flags?.length}
            </Button>
          )}
          
          {!isReadOnly && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground" 
              onClick={() => setCommentsOpen(!commentsOpen)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {/* Log the length being displayed */}
              {/* {console.log(`QuestionItem (${question.id}): Rendering comment count:`, answer?.comments?.length || 0)} */}
              {answer?.comments?.length || 0}
            </Button>
          )}
        </div>
      </div>
      
      {hasFlags && latestFlag && (
        <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>This answer has been flagged for revision</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Feedback from reviewer:</p>
            <p className="italic">"{latestFlag.comment}"</p>
            <p className="mt-2 text-sm">Please update your answer based on this feedback and resubmit.</p>
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  {renderFormControl()}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button 
                type="submit" 
                variant="secondary" 
                size="sm"
              >
                Save
              </Button>
            </div>
          )}
        </form>
      </Form>
      {/* Direct Feedback Input Section */}
      <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
        <CollapsibleContent className="mt-4 pt-4 border-t">
          <div className="space-y-2">
            <label htmlFor={`feedback-${question.id}`} className="text-sm font-medium">Your Feedback/Comment</label>
            <Textarea
              id={`feedback-${question.id}`}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Add your comment or feedback here..."
              rows={3}
              disabled={isReadOnly}
            />
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (feedbackText.trim()) {
                      onAddComment(feedbackText);
                      setFeedbackText(""); // Clear input after saving
                      setCommentsOpen(false); // Close after saving
                    }
                  }}
                  disabled={!feedbackText.trim()}
                >
                  Save Feedback
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default QuestionItem;
