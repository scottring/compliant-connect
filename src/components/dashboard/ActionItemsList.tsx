import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Edit, FileText, Inbox } from 'lucide-react';
import { PIRStatus } from '@/types/pir'; // Assuming PIRStatus is here

export interface ActionItem {
  id: string;
  actionText: string;
  description: string;
  link: string;
  status: PIRStatus;
  updatedAt: string;
}

interface ActionItemsListProps {
  items: ActionItem[];
}

const getStatusIcon = (status: PIRStatus) => {
  switch (status) {
    case 'submitted':
      return <FileText className="h-5 w-5 text-blue-500" />; // Needs Review
    case 'pending':
      return <Inbox className="h-5 w-5 text-orange-500" />; // Needs Response
    case 'flagged':
      return <AlertTriangle className="h-5 w-5 text-red-500" />; // Needs Revision
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

const ActionItemsList: React.FC<ActionItemsListProps> = ({ items }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No pending action items!</p>
        <p className="text-sm text-muted-foreground">You're all caught up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
             <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 pt-1">
                    {getStatusIcon(item.status)}
                </div>
                <div className="flex-1">
                    <CardTitle className="text-base">{item.actionText}</CardTitle>
                    <CardDescription className="text-sm">{item.description}</CardDescription>
                </div>
             </div>
          </CardHeader>
          <CardFooter className="flex justify-between items-center pt-0 pb-3 px-6">
             <p className="text-xs text-muted-foreground">
                Last updated: {new Date(item.updatedAt).toLocaleDateString()}
             </p>
            <Button size="sm" variant="outline" onClick={() => navigate(item.link)}>
              {item.actionText.includes("Review") ? "Review" :
               item.actionText.includes("Respond") ? "Respond" :
               item.actionText.includes("Revision") ? "Revise" : "View"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default ActionItemsList;