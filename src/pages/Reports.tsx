import React from 'react';
// Use relative paths for components
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from "../components/ui/progress";
import { Tag, BarChart3 } from 'lucide-react';

// Mock data for compliance reports per tag
const mockReportData = [
  { tagName: 'Compliance', totalQuestions: 50, approvedAnswers: 42, compliancePercentage: 84 },
  { tagName: 'Product', totalQuestions: 75, approvedAnswers: 68, compliancePercentage: 91 },
  { tagName: 'Material', totalQuestions: 30, approvedAnswers: 25, compliancePercentage: 83 },
  { tagName: 'Process', totalQuestions: 20, approvedAnswers: 19, compliancePercentage: 95 },
  // Add more tags if needed
];

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Reports"
        description="Overview of compliance status across different tags."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockReportData.map((report, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                 <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                 {report.tagName}
              </CardTitle>
               <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.compliancePercentage}%</div>
              <p className="text-xs text-muted-foreground">
                {report.approvedAnswers} of {report.totalQuestions} questions compliant
              </p>
              <Progress value={report.compliancePercentage} className="mt-2 h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

       {/* Placeholder for more detailed reports or charts */}
       <Card>
         <CardHeader>
           <CardTitle>Detailed Report Placeholder</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">More detailed reports and visualizations will be available here.</p>
           {/* Example: Could add a mock chart component later */}
         </CardContent>
       </Card>

    </div>
  );
};

export default Reports;