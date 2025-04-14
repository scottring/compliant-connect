import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/types/supabase'; // Assuming this path is correct based on project structure
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Assuming path based on project structure
import { Button } from '@/components/ui/button'; // Assuming path based on project structure
import { Loader2 } from 'lucide-react'; // Using lucide-react for loading spinner
import clsx from 'clsx'; // For conditional class names
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Define the type for a row in the pir_response_components table
type ComponentRow = Database['public']['Tables']['pir_response_components']['Row'];

// Define the props for the ComponentManager component
interface ComponentManagerProps {
  pirResponseId: string; // The ID of the parent PIR response
  isReadOnly?: boolean; // Optional flag to disable editing/deleting
  onComponentSelect: (id: string | null) => void; // Callback when a component row is selected
  selectedComponentId: string | null; // The ID of the currently selected component
  isDialogOpen: boolean; // Control dialog visibility from parent
  onOpenChange: (open: boolean) => void; // Notify parent of dialog state changes
}

const ComponentManager: React.FC<ComponentManagerProps> = ({
  pirResponseId,
  isReadOnly = false,
  onComponentSelect,
  selectedComponentId,
  isDialogOpen, // Destructure new prop
  onOpenChange, // Destructure new prop
}) => {
  // Get the Supabase client instance
  const supabase = useSupabaseClient<Database>();

  // State for storing the list of components
  const [components, setComponents] = useState<ComponentRow[]>([]);
  // State for tracking loading status during data fetch
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State for storing any errors during data fetch
  const [error, setError] = useState<string | null>(null);

  // State for Add/Edit Dialog (Dialog open state is now controlled by parent)
  const [editingComponent, setEditingComponent] = useState<ComponentRow | null>(null);
  // State for form inputs
  const [componentName, setComponentName] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Function to fetch components
  const fetchComponents = async () => {
    // Don't fetch if pirResponseId is not provided
    if (!pirResponseId) {
      setComponents([]); // Clear components if ID is missing
      return;
    }

    setIsLoading(true); // Set loading state to true
    setError(null); // Clear any previous errors

    try {
      // Fetch components from the Supabase table
      const { data, error: fetchError } = await supabase
        .from('pir_response_components') // Target the correct table
        .select('*') // Select all columns
        .eq('pir_response_id', pirResponseId) // Filter by the provided pirResponseId
        .order('order_index', { ascending: true }); // Order by order_index

      // Handle potential fetch errors
      if (fetchError) {
        throw fetchError;
      }

      // Update the components state with fetched data (or empty array if null)
      setComponents(data || []);
    } catch (err: any) {
      // Log the error and update the error state
      console.error('Error fetching components:', err);
      setError(`Failed to fetch components: ${err.message}`);
      toast.error(`Failed to fetch components: ${err.message}`); // Show toast on fetch error
    } finally {
      // Set loading state to false regardless of success or failure
      setIsLoading(false);
    }
  };

  // Effect hook to fetch components when the component mounts or pirResponseId changes
  useEffect(() => {
    fetchComponents(); // Execute the fetch function
  }, [pirResponseId, supabase]); // Dependencies: re-run effect if pirResponseId or supabase client changes

  // Function to open the dialog for adding a new component (Now handled by parent via onAddComponentRequest prop in QuestionItem)

  // Function to open the dialog for editing an existing component
  const handleEditComponent = (component: ComponentRow) => {
    setEditingComponent(component); // Set the component to be edited
    setComponentName(component.component_name || ''); // Populate form fields
    setPosition(component.position || '');
    onOpenChange(true); // Open the dialog via parent callback
  };


  // Function to handle saving (inserting or updating) a component
  const handleSaveComponent = async () => {
    if (!componentName.trim()) {
      toast.error('Component name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let error: any = null;

      if (editingComponent) {
        // Update existing component
        const { error: updateError } = await supabase
          .from('pir_response_components')
          .update({
            component_name: componentName.trim(),
            position: position.trim() || null, // Use null if position is empty
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingComponent.id);
        error = updateError;
      } else {
        // --- Start: Add check for valid pirResponseId before insert ---
        if (!pirResponseId) { // Checks for null, undefined, empty string
          toast.error("Cannot add component: Missing response context.");
          setIsSaving(false); // Reset saving state as we are aborting
          // Optionally close the dialog if desired: setIsDialogOpen(false);
          return; // Stop execution if ID is invalid
        }
        // --- End: Add check ---

        // Insert new component
        const nextOrderIndex = components.length; // Simple order index calculation
        const { error: insertError } = await supabase
          .from('pir_response_components')
          .insert({
            pir_response_id: pirResponseId,
            component_name: componentName.trim(),
            position: position.trim() || null, // Use null if position is empty
            order_index: nextOrderIndex,
          });
        error = insertError;
      }

      if (error) {
        throw error;
      }

      toast.success(`Component successfully ${editingComponent ? 'updated' : 'added'}.`);
      onOpenChange(false); // Close dialog via parent callback
      await fetchComponents(); // Refetch the list

    } catch (err: any) {
      console.error('Error saving component:', err);
      setError(`Failed to save component: ${err.message}`);
      toast.error(`Failed to save component: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle deleting a component
  const handleDeleteComponent = async (componentId: string) => {
    // Find the component name for the confirmation message
    const componentToDelete = components.find(c => c.id === componentId);
    const componentNameToConfirm = componentToDelete?.component_name || 'this component';

    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to delete "${componentNameToConfirm}"? This action cannot be undone.`)) {
      return; // Abort if user cancels
    }

    setError(null); // Clear previous errors

    try {
      // Perform delete operation
      const { error: deleteError } = await supabase
        .from('pir_response_components')
        .delete()
        .eq('id', componentId);

      if (deleteError) {
        throw deleteError;
      }

      toast.success('Component successfully deleted.');
      await fetchComponents(); // Refetch the list

      // If the deleted component was the selected one, clear the selection
      if (selectedComponentId === componentId) {
        onComponentSelect(null);
      }

    } catch (err: any) {
      console.error('Error deleting component:', err);
      setError(`Failed to delete component: ${err.message}`);
      toast.error(`Failed to delete component: ${err.message}`);
    }
  };

  // Display loading indicator while fetching data
  if (isLoading) {
    return <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading components...</div>;
  }

  // Display error message if fetching failed
  if (error) {
    return <div className="text-red-600 p-4 border border-red-300 rounded bg-red-50">Error: {error}</div>;
  }

  // Render the main component UI
  return (<>
    <div className="space-y-4 p-4 border rounded-md">
      <h3 className="text-lg font-semibold">Components</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component Name</TableHead>
            <TableHead>Position</TableHead>
            {/* Only show Actions column if not read-only */}
            {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Show message if no components are found */}
          {components.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isReadOnly ? 2 : 3} className="text-center text-gray-500 py-4">
                No components have been added yet.
              </TableCell>
            </TableRow>
          ) : (
            // Map through the fetched components and render a table row for each
            components.map((component) => (
              <TableRow
                key={component.id}
                onClick={() => onComponentSelect(component.id)} // Call onComponentSelect on click
                className={clsx(
                  "cursor-pointer hover:bg-muted/50", // Basic clickable styling
                  { 'bg-muted': selectedComponentId === component.id } // Apply 'bg-muted' if selected
                )}
              >
                <TableCell>{component.component_name || 'N/A'}</TableCell>
                <TableCell>{component.position || 'N/A'}</TableCell>
                {/* Only show action buttons if not read-only */}
                {!isReadOnly && (
                  <TableCell className="text-right space-x-2">
                    {/* Stop propagation to prevent row click when clicking buttons */}
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditComponent(component); }}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteComponent(component.id); }}>
                      Delete
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add Component button is now rendered in QuestionItem */}
    </div>

      {/* Add/Edit Component Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
            <DialogDescription>
              {editingComponent ? 'Update the details for this component.' : 'Enter the details for the new component.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="componentName" className="text-right">
                Name
              </Label>
              <Input
                id="componentName"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                className="col-span-3"
                disabled={isSaving}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Position
              </Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="col-span-3"
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            {/* DialogClose might interfere with controlled state, handle close via onOpenChange */}
            {/* <DialogClose asChild> */}
            <Button type="button" variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* </DialogClose> */}
            <Button type="button" onClick={handleSaveComponent} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Component'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
</>);
};

export default ComponentManager;