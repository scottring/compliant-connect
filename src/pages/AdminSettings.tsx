import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resetAllData } from "@/utils/resetData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminSettings = () => {
  const [testEmail, setTestEmail] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    try {
      // Invoke the test-email function
      const { error } = await supabase.functions.invoke('test-email', {
        body: { to: testEmail }
      });

      if (error) {
        throw error;
      }

      toast.success(`Test email sent to ${testEmail}`);
      setTestEmail("");
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error(`Failed to send test email: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Settings"
        description="Configure system settings and test functionality"
      />

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Email Testing</h2>
          <p className="text-muted-foreground mb-4">
            Send a test email to verify that your email notifications are working correctly.
          </p>

          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleSendTestEmail} 
              disabled={isSending || !testEmail}
            >
              {isSending ? "Sending..." : "Send Test Email"}
            </Button>
          </div>
        </div>
      </div>

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