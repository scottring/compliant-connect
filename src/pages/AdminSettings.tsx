import React from 'react';
import PageHeader from "@/components/PageHeader";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button"; // Import Button
import { resetAllData } from "@/utils/resetData"; // Assuming resetAllData is correctly located

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Settings"
        subtitle="Manage application-wide settings and data."
        // No actions needed in the header itself for now
      />

      <div className="p-4 border rounded-md">
        <h3 className="text-lg font-semibold mb-4">Data Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use the following options with extreme caution. These actions are irreversible.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Reset All Application Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all application data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all suppliers, product sheets, questions, tags, and other data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Reset Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminSettings;