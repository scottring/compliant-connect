import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Added for closing the dialog
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Added for recyclable select
import { toast } from 'sonner'; // Added for notifications
import { Loader2, AlertCircle, PlusCircle, Edit, Trash2 } from 'lucide-react';

type MaterialRow = Database['public']['Tables']['pir_response_component_materials']['Row'];

interface MaterialManagerProps {
  selectedComponentId: string | null;
  isReadOnly?: boolean;
}

const MaterialManager: React.FC<MaterialManagerProps> = ({
  selectedComponentId,
  isReadOnly = false,
}) => {
  const supabase = useSupabaseClient<Database>();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // --- New State ---
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialRow | null>(null);
  // --- Form State (could also be managed within the dialog component itself) ---
  const [materialName, setMaterialName] = useState('');
  const [percentage, setPercentage] = useState<string>(''); // Store as string for input
  const [recyclable, setRecyclable] = useState<string>('false'); // Default to 'false' string for Select


  const fetchMaterials = useCallback(async () => {
    if (!selectedComponentId) {
      setMaterials([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pir_response_component_materials')
        .select('*')
        .eq('component_id', selectedComponentId)
        .order('order_index', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setMaterials(data || []);
    } catch (err: any) {
      console.error('Error fetching materials:', err);
      setError(`Failed to fetch materials: ${err.message}`);
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedComponentId, supabase]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleAddMaterial = () => {
    if (!selectedComponentId) {
      toast.error('Please select a component first.');
      return;
    }
    setEditingMaterial(null); // Ensure we are in "add" mode
    // Reset form fields for adding new
    setMaterialName('');
    setPercentage('');
    setRecyclable('false');
    setIsMaterialDialogOpen(true);
  };
  const handleSaveMaterial = async () => {
    if (!selectedComponentId) {
      toast.error('Cannot save material without a selected component.');
      return;
    }

    // Validate required fields (basic example)
    if (!materialName.trim()) {
      toast.error('Material name cannot be empty.');
      return;
    }

    setIsLoading(true); // Use the existing isLoading state for the save operation
    setError(null);

    // --- Prepare data --- 
    const percentageValue = parseFloat(percentage);
    const isRecyclable = recyclable === 'true';
    const materialData = {
      material_name: materialName.trim(),
      // Set percentage to null if parsing failed or input was empty, otherwise use the parsed number
      percentage: !isNaN(percentageValue) && percentage.trim() !== '' ? percentageValue : null,
      recyclable: isRecyclable ? 'true' : 'false', // Send as string
    };

    try {
      if (editingMaterial) {
        // --- Update existing material ---
        const { error: updateError } = await supabase
          .from('pir_response_component_materials')
          .update(materialData)
          .eq('id', editingMaterial.id)
          .select(); // Select to check if update was successful

        if (updateError) throw updateError;
        toast.success('Material updated successfully!');
      } else {
        // --- Insert new material ---
        const nextOrderIndex = materials.length; // Simple order index calculation
        const { error: insertError } = await supabase
          .from('pir_response_component_materials')
          .insert([
            {
              ...materialData,
              component_id: selectedComponentId,
              order_index: nextOrderIndex,
            },
          ])
          .select(); // Select to check if insert was successful

        if (insertError) throw insertError;
        toast.success('Material added successfully!');
      }

      // --- Post-save actions ---
      setIsMaterialDialogOpen(false); // Close dialog on success
      setEditingMaterial(null); // Reset editing state
      await fetchMaterials(); // Refetch the list

    } catch (err: any) {
      console.error('Error saving material:', err);
      setError(`Failed to save material: ${err.message}`); // Keep error state for potential display
      toast.error(`Failed to save material: ${err.message}`);
    } finally {
      setIsLoading(false); // Ensure loading state is reset
    }
  };


  // --- Add/Edit Dialog --- 
  function renderMaterialDialog() {
    return (
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add New Material'}</DialogTitle>
            <DialogDescription>
              {editingMaterial
                ? 'Update the details for this material.'
                : 'Enter the details for the new material.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="material-name" className="text-right">
                Name
              </Label>
              <Input
                id="material-name"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                className="col-span-3"
                disabled={isLoading} // Disable while saving
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="percentage" className="text-right">
                Percentage (%)
              </Label>
              <Input
                id="percentage"
                type="number" // Use number type for better input control
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)} // Keep as string for now
                className="col-span-3"
                placeholder="e.g., 25.5"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recyclable" className="text-right">
                Recyclable
              </Label>
              <Select
                value={recyclable}
                onValueChange={setRecyclable}
                disabled={isLoading}
              >
                <SelectTrigger id="recyclable" className="col-span-3">
                  <SelectValue placeholder="Select recyclability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveMaterial} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingMaterial ? 'Save Changes' : 'Add Material'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }


  const handleEditMaterial = (material: MaterialRow) => {
    if (!material) return;
    setEditingMaterial(material);
    // Populate form fields for editing
    setMaterialName(material.material_name || '');
    setPercentage(material.percentage?.toString() ?? ''); // Convert number to string for input
    setRecyclable(material.recyclable ? 'true' : 'false'); // Convert boolean to string for Select
    setIsMaterialDialogOpen(true);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    // Basic confirmation
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('pir_response_component_materials')
        .delete()
        .eq('id', materialId);

      if (deleteError) throw deleteError;

      toast.success('Material deleted successfully!');
      await fetchMaterials(); // Refetch the list

    } catch (err: any) {
      console.error('Error deleting material:', err);
      setError(`Failed to delete material: ${err.message}`);
      toast.error(`Failed to delete material: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedComponentId) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select a component to view/edit its materials.
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Component Materials</h3>
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2">Loading materials...</span>
        </div>
      )}
      {error && !isLoading && (
        <div className="flex items-center p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      {!isLoading && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material Name</TableHead>
                <TableHead className="text-right">Percentage (%)</TableHead>
                <TableHead>Recyclable</TableHead>
                {!isReadOnly && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 3 : 4} className="text-center text-gray-500">
                    No materials added yet.
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>{material.material_name}</TableCell>
                    <TableCell className="text-right">{material.percentage ?? 'N/A'}</TableCell>
                    <TableCell>{material.recyclable ? 'Yes' : 'No'}</TableCell>
                    {!isReadOnly && (
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMaterial(material)} // Pass the full material object
                          aria-label={`Edit material ${material.material_name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {/* Delete button moved below */}

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMaterial(material.id)}
                          aria-label={`Delete material ${material.material_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!isReadOnly && (
            <div className="mt-4">
              <Button onClick={handleAddMaterial}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </div>
          )}
        </>
      )}
      {/* Render the dialog outside the table structure */}
      {renderMaterialDialog()}
    </div>
  );
};

export default MaterialManager;