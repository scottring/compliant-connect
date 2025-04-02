import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useQuestionBankContext } from '@/context/QuestionBankContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Upload, FileUp, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SpecializedExcelImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

interface ExcelTabs {
  main: XLSX.WorkSheet | null;
  dropdowns: XLSX.WorkSheet | null;
  materials: XLSX.WorkSheet | null;
  batteryTypes: XLSX.WorkSheet | null;
}

interface DropdownOptions {
  [key: string]: string[];
}

interface ExcelQuestion {
  category: string;
  dataPoint: string;
  definition: string;
  dataType: string;
  options?: string[];
  isComponentQuestion?: boolean;
  isMaterialQuestion?: boolean;
  componentIndex?: number;
  materialIndex?: number;
  parentComponent?: string;
}

const SpecializedExcelImporter: React.FC<SpecializedExcelImporterProps> = ({ 
  open, 
  onOpenChange,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [tabs, setTabs] = useState<ExcelTabs>({
    main: null,
    dropdowns: null,
    materials: null,
    batteryTypes: null
  });
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({});
  const [questions, setQuestions] = useState<ExcelQuestion[]>([]);
  const [importingStep, setImportingStep] = useState<'upload' | 'analyze' | 'preview' | 'importing'>('upload');
  const [progress, setProgress] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    imported: 0,
    failed: 0
  });
  
  const { createQuestion } = useQuestionBankContext();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      readExcelFile(selectedFile);
    }
  };

  const readExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      setWorkbook(wb);
      
      // Get all sheets
      const mainSheet = wb.Sheets[wb.SheetNames[0]];
      const dropdownsSheet = wb.Sheets['Dropdowns'] || null;
      const materialsSheet = wb.Sheets['Materials'] || null;
      const batteryTypesSheet = wb.Sheets['Battery Types'] || null;
      
      setTabs({
        main: mainSheet,
        dropdowns: dropdownsSheet,
        materials: materialsSheet,
        batteryTypes: batteryTypesSheet
      });
      
      // Move to analysis step
      setImportingStep('analyze');
      
      // Start analyzing the sheets
      await analyzeSheets(mainSheet, dropdownsSheet, materialsSheet, batteryTypesSheet);
      
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast.error('Error reading Excel file');
    }
  };

  const analyzeSheets = async (
    mainSheet: XLSX.WorkSheet,
    dropdownsSheet: XLSX.WorkSheet | null,
    materialsSheet: XLSX.WorkSheet | null,
    batteryTypesSheet: XLSX.WorkSheet | null
  ) => {
    try {
      // First process dropdowns if available
      if (dropdownsSheet) {
        const dropdowns = XLSX.utils.sheet_to_json<any>(dropdownsSheet);
        const processedDropdowns: DropdownOptions = {};
        
        dropdowns.forEach((row: any) => {
          const listName = Object.keys(row)[0];
          if (listName) {
            processedDropdowns[listName] = Object.values(row).filter((value): value is string => typeof value === 'string');
          }
        });
        
        setDropdownOptions(processedDropdowns);
      }
      
      // Process main questions
      const mainData = XLSX.utils.sheet_to_json<any>(mainSheet);
      const processedQuestions: ExcelQuestion[] = mainData.map((row: any) => ({
        category: row['Category'] || 'Uncategorized',
        dataPoint: row['Data Point'] || '',
        definition: row['Definition'] || '',
        dataType: row['Data Type'] || 'text',
        options: row['Options'] ? row['Options'].split(',').map((opt: string) => opt.trim()) : undefined
      }));
      
      // Process materials if available
      if (materialsSheet) {
        const materialsData = XLSX.utils.sheet_to_json<any>(materialsSheet);
        materialsData.forEach((row: any, index: number) => {
          if (row['Component'] && row['Material']) {
            processedQuestions.push({
              category: 'Materials',
              dataPoint: row['Material'],
              definition: row['Description'] || '',
              dataType: 'text',
              isComponentQuestion: false,
              isMaterialQuestion: true,
              componentIndex: Math.floor(index / 5) + 1,
              materialIndex: (index % 5) + 1,
              parentComponent: row['Component']
            });
          }
        });
      }
      
      setQuestions(processedQuestions);
      setImportingStep('preview');
      
    } catch (error) {
      console.error('Error analyzing sheets:', error);
      toast.error('Error analyzing Excel sheets');
    }
  };

  const getQuestionType = (excelType: string): 'text' | 'number' | 'boolean' | 'select' | 'multi-select' | 'file' => {
    switch (excelType.toLowerCase()) {
      case 'number':
        return 'number';
      case 'boolean':
      case 'yes/no':
        return 'boolean';
      case 'single select':
      case 'dropdown':
        return 'select';
      case 'multi select':
      case 'multiple choice':
        return 'multi-select';
      case 'file':
      case 'attachment':
        return 'file';
      default:
        return 'text';
    }
  };

  const convertToDatabaseQuestion = (question: ExcelQuestion) => {
    // Generate question text with proper hierarchy
    let questionText = question.dataPoint;
    
    // For component and material questions, include the hierarchy in the question
    if (question.isComponentQuestion && question.componentIndex) {
      questionText = `Component ${question.componentIndex}: ${question.dataPoint}`;
    } else if (question.isMaterialQuestion && question.componentIndex && question.materialIndex) {
      questionText = `Component ${question.componentIndex}, Material ${question.materialIndex}: ${question.dataPoint}`;
    } else if (question.parentComponent) {
      questionText = `${question.parentComponent}: ${question.dataPoint}`;
    }
    
    // Return question object in the format our app expects
    return {
      text: questionText,
      description: question.definition,
      type: getQuestionType(question.dataType),
      required: false,
      options: question.options || [],
      tags: []
    };
  };

  const toggleQuestion = (index: string) => {
    if (selectedQuestions.includes(index)) {
      setSelectedQuestions(selectedQuestions.filter(idx => idx !== index));
    } else {
      setSelectedQuestions([...selectedQuestions, index]);
    }
  };

  const handleImport = async () => {
    setImportingStep('importing');
    setImportStats({
      total: selectedQuestions.length,
      imported: 0,
      failed: 0
    });
    
    for (const index of selectedQuestions) {
      const question = questions[parseInt(index)];
      if (question) {
        try {
          await createQuestion(convertToDatabaseQuestion(question));
          setImportStats(prev => ({ ...prev, imported: prev.imported + 1 }));
        } catch (error) {
          console.error('Error importing question:', error);
          setImportStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }
      setProgress((parseInt(index) + 1) / selectedQuestions.length * 100);
    }
    
    toast.success(`Successfully imported ${importStats.imported} questions`);
    if (importStats.failed > 0) {
      toast.error(`Failed to import ${importStats.failed} questions`);
    }
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Import Questions from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {importingStep === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="excel-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileUp className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Excel files only (.xlsx, .xls)
                    </p>
                  </div>
                  <input
                    id="excel-upload"
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                  />
                </label>
              </div>
            </div>
          )}

          {importingStep === 'analyze' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p>Analyzing Excel file...</p>
              </div>
            </div>
          )}

          {importingStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {questions.length} questions
                </p>
                <Button
                  onClick={handleImport}
                  disabled={selectedQuestions.length === 0}
                >
                  Import Selected ({selectedQuestions.length})
                </Button>
              </div>

              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/10"
                    >
                      <Checkbox
                        id={`question-${index}`}
                        checked={selectedQuestions.includes(index.toString())}
                        onCheckedChange={() => toggleQuestion(index.toString())}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor={`question-${index}`}
                          className="text-sm font-medium"
                        >
                          {question.dataPoint}
                        </Label>
                        {question.definition && (
                          <p className="text-sm text-muted-foreground">
                            {question.definition}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>Type: {question.dataType}</span>
                          <span>•</span>
                          <span>Category: {question.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {importingStep === 'importing' && (
            <div className="space-y-4">
              <Progress value={progress} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Imported: {importStats.imported}</span>
                <span>Failed: {importStats.failed}</span>
                <span>Total: {importStats.total}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpecializedExcelImporter; 