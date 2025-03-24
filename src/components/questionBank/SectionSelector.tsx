
import React, { useState } from "react";
import { Section, Subsection } from "@/types";
import { Plus, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SectionSelectorProps {
  sections: Section[];
  subsections: Subsection[];
  selectedSectionId: string | undefined;
  selectedSubsectionId: string | undefined;
  onSectionChange: (sectionId: string) => void;
  onSubsectionChange: (subsectionId: string) => void;
  onAddSection: (section: Omit<Section, "id">) => void;
  onAddSubsection: (subsection: Omit<Subsection, "id">) => void;
  onUpdateSection: (section: Section) => void;
  onUpdateSubsection: (subsection: Subsection) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteSubsection: (subsectionId: string) => void;
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  sections,
  subsections,
  selectedSectionId,
  selectedSubsectionId,
  onSectionChange,
  onSubsectionChange,
  onAddSection,
  onAddSubsection,
  onUpdateSection,
  onUpdateSubsection,
  onDeleteSection,
  onDeleteSubsection,
}) => {
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false);
  const [isAddingSubsectionOpen, setIsAddingSubsectionOpen] = useState(false);
  const [isEditingSectionOpen, setIsEditingSectionOpen] = useState(false);
  const [isEditingSubsectionOpen, setIsEditingSubsectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSubsectionName, setNewSubsectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSubsectionId, setEditingSubsectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSubsectionName, setEditSubsectionName] = useState("");

  const filteredSubsections = subsections.filter(
    (subsection) => subsection.sectionId === selectedSectionId
  );

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      onAddSection({
        name: newSectionName,
        order: sections.length + 1,
      });
      setNewSectionName("");
      setIsAddingSectionOpen(false);
    }
  };

  const handleAddSubsection = () => {
    if (newSubsectionName.trim() && selectedSectionId) {
      onAddSubsection({
        name: newSubsectionName,
        sectionId: selectedSectionId,
        order: filteredSubsections.length + 1,
      });
      setNewSubsectionName("");
      setIsAddingSubsectionOpen(false);
    }
  };

  const handleEditSection = () => {
    if (editSectionName.trim() && editingSectionId) {
      const sectionToUpdate = sections.find((s) => s.id === editingSectionId);
      if (sectionToUpdate) {
        onUpdateSection({
          ...sectionToUpdate,
          name: editSectionName,
        });
      }
      setEditingSectionId(null);
      setEditSectionName("");
      setIsEditingSectionOpen(false);
    }
  };

  const handleEditSubsection = () => {
    if (editSubsectionName.trim() && editingSubsectionId) {
      const subsectionToUpdate = subsections.find(
        (s) => s.id === editingSubsectionId
      );
      if (subsectionToUpdate) {
        onUpdateSubsection({
          ...subsectionToUpdate,
          name: editSubsectionName,
        });
      }
      setEditingSubsectionId(null);
      setEditSubsectionName("");
      setIsEditingSubsectionOpen(false);
    }
  };

  const openEditSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
    setIsEditingSectionOpen(true);
  };

  const openEditSubsection = (subsection: Subsection) => {
    setEditingSubsectionId(subsection.id);
    setEditSubsectionName(subsection.name);
    setIsEditingSubsectionOpen(true);
  };

  const getSectionLabel = (section: Section) => {
    return `${section.order}. ${section.name}`;
  };

  const getSubsectionLabel = (subsection: Subsection) => {
    const parentSection = sections.find((s) => s.id === subsection.sectionId);
    return `${parentSection?.order}.${subsection.order} ${subsection.name}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end space-x-2">
        <div className="flex-1 space-y-2">
          <Label>Section</Label>
          <div className="flex space-x-2">
            <Select
              value={selectedSectionId}
              onValueChange={onSectionChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{getSectionLabel(section)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => setIsAddingSectionOpen(true)}
              disabled={sections.length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            {selectedSectionId && (
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => {
                  const section = sections.find(s => s.id === selectedSectionId);
                  if (section) openEditSection(section);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {selectedSectionId && (
        <div className="flex items-end space-x-2">
          <div className="flex-1 space-y-2">
            <Label>Subsection</Label>
            <div className="flex space-x-2">
              <Select
                value={selectedSubsectionId}
                onValueChange={onSubsectionChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a subsection" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubsections.map((subsection) => (
                    <SelectItem key={subsection.id} value={subsection.id}>
                      {getSubsectionLabel(subsection)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => setIsAddingSubsectionOpen(true)}
                disabled={filteredSubsections.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              {selectedSubsectionId && (
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => {
                    const subsection = subsections.find(s => s.id === selectedSubsectionId);
                    if (subsection) openEditSubsection(subsection);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Section Dialog */}
      <Dialog open={isAddingSectionOpen} onOpenChange={setIsAddingSectionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sectionName">Section Name</Label>
              <Input
                id="sectionName"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Enter section name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSection}>Add Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subsection Dialog */}
      <Dialog open={isAddingSubsectionOpen} onOpenChange={setIsAddingSubsectionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Subsection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subsectionName">Subsection Name</Label>
              <Input
                id="subsectionName"
                value={newSubsectionName}
                onChange={(e) => setNewSubsectionName(e.target.value)}
                placeholder="Enter subsection name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSubsectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubsection}>Add Subsection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={isEditingSectionOpen} onOpenChange={setIsEditingSectionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editSectionName">Section Name</Label>
              <Input
                id="editSectionName"
                value={editSectionName}
                onChange={(e) => setEditSectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (editingSectionId && window.confirm("Are you sure you want to delete this section? All subsections and questions within this section will also be deleted.")) {
                  onDeleteSection(editingSectionId);
                  setIsEditingSectionOpen(false);
                }
              }}
              className="mr-auto"
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsEditingSectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSection}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subsection Dialog */}
      <Dialog open={isEditingSubsectionOpen} onOpenChange={setIsEditingSubsectionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Subsection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editSubsectionName">Subsection Name</Label>
              <Input
                id="editSubsectionName"
                value={editSubsectionName}
                onChange={(e) => setEditSubsectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (editingSubsectionId && window.confirm("Are you sure you want to delete this subsection? All questions within this subsection will also be deleted.")) {
                  onDeleteSubsection(editingSubsectionId);
                  setIsEditingSubsectionOpen(false);
                }
              }}
              className="mr-auto"
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsEditingSubsectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubsection}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {selectedSubsectionId && (
        <div className="mt-2">
          <Badge variant="outline" className="text-sm">
            {(() => {
              const subsection = subsections.find(s => s.id === selectedSubsectionId);
              const section = sections.find(s => s.id === subsection?.sectionId);
              if (section && subsection) {
                return `${section.order}.${subsection.order}`;
              }
              return "";
            })()}
          </Badge>
        </div>
      )}
    </div>
  );
};
