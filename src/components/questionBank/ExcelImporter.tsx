import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { DBQuestion } from '@/hooks/use-question-bank';

// Field mapping options
const FIELD_OPTIONS = [
  { value: 'text', label: 'Question Text' },
  { value: 'description', label: 'Description' },
  { value: 'type', label: 'Question Type' },
  { value: 'required', label: 'Required (Yes/No)' },
  { value: 'options', label: 'Options (comma separated)' },
  { value: 'category', label: 'Category/Section' },
  { value: 'subcategory', label: 'Subcategory/Subsection' },
  { value: 'tags', label: 'Tags (comma separated)' },
  { value: 'ignore', label: '-- Ignore this column --' },
];

// Question type mapping
const QUESTION_TYPE_MAP: Record<string, string> = {
  'text': 'text',
  'string': 'text',
  'number': 'number',
  'numeric': 'number',
  'boolean': 'boolean',
  'yes/no': 'boolean',
  'single choice': 'select',
  'single': 'select',
  'select': 'select',
  'dropdown': 'select',
  'multiple': 'multi-select',
  'multiple choice': 'multi-select',
  'multi-select': 'multi-select',
  'file': 'file',
  'file upload': 'file',
  'table': 'table'
};

interface ExcelImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

const ExcelImporter: React.FC<ExcelImporterProps> = ({ 
  open, 
  onOpenChange,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  
  // Get app context for adding questions
  const { addQuestion, dbCategories, refreshQuestions } = useApp();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get sheet names
        const sheets = workbook.SheetNames;
        setSheetNames(sheets);
        
        if (sheets.length > 0) {
          setSelectedSheet(sheets[0]);
          processSheet(workbook, sheets[0]);
        }
        
        setImportStep('mapping');
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error('Failed to read Excel file. Please make sure it\'s a valid Excel/CSV file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Process selected sheet
  const processSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      toast.error('The selected sheet has no data or headers.');
      return;
    }
    
    // Extract headers
    const headers = jsonData[0] as string[];
    setHeaders(headers);
    
    // Set default mappings
    const defaultMappings: Record<string, string> = {};
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      
      // Try to auto-map common column names
      if (lowerHeader.includes('question') || lowerHeader.includes('text')) {
        defaultMappings[index] = 'text';
      } else if (lowerHeader.includes('description')) {
        defaultMappings[index] = 'description';
      } else if (lowerHeader.includes('type')) {
        defaultMappings[index] = 'type';
      } else if (lowerHeader.includes('required') || lowerHeader.includes('mandatory')) {
        defaultMappings[index] = 'required';
      } else if (lowerHeader.includes('option') || lowerHeader.includes('choices')) {
        defaultMappings[index] = 'options';
      } else if (lowerHeader.includes('category') || lowerHeader.includes('section')) {
        defaultMappings[index] = 'category';
      } else if (lowerHeader.includes('subcategory') || lowerHeader.includes('subsection')) {
        defaultMappings[index] = 'subcategory';
      } else if (lowerHeader.includes('tag')) {
        defaultMappings[index] = 'tags';
      } else {
        defaultMappings[index] = 'ignore';
      }
    });
    
    setColumnMappings(defaultMappings);
    
    // Set preview data (first 5 rows after header)
    setPreviewData(jsonData.slice(1, 6) as any[]);
  };

  // Change sheet selection
  const handleSheetChange = (sheetName: string) => {
    if (!file) return;
    
    setSelectedSheet(sheetName);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      processSheet(workbook, sheetName);
    };
    reader.readAsArrayBuffer(file);
  };

  // Update column mapping
  const updateMapping = (columnIndex: string, value: string) => {
    setColumnMappings({
      ...columnMappings,
      [columnIndex]: value
    });
  };

  // Process for preview
  const handlePreview = () => {
    const errors = validateMappings();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setImportStep('preview');
  };

  // Validate mappings
  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const mappedFields = Object.values(columnMappings);
    
    // Check if question text is mapped
    if (!mappedFields.includes('text')) {
      errors.push('Question Text field must be mapped to at least one column.');
    }
    
    return errors;
  };

  // Import questions
  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setImportStep('importing');
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[selectedSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          toast.error('No data found in the selected sheet.');
          setImporting(false);
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        // Process each row
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of rows) {
          try {
            const questionData: Record<string, any> = {};
            
            // Map columns according to user selections
            Object.entries(columnMappings).forEach(([index, fieldType]) => {
              if (fieldType !== 'ignore') {
                const colIndex = parseInt(index);
                const value = row[colIndex];
                
                if (value !== undefined) {
                  questionData[fieldType] = value;
                }
              }
            });
            
            // Skip rows without question text
            if (!questionData.text || questionData.text.toString().trim() === '') {
              continue;
            }
            
            // Process question type
            if (questionData.type) {
              const typeStr = questionData.type.toString().toLowerCase();
              questionData.type = QUESTION_TYPE_MAP[typeStr] || 'text';
            } else {
              questionData.type = 'text';
            }
            
            // Process required field
            if (questionData.required !== undefined) {
              const reqStr = questionData.required.toString().toLowerCase();
              questionData.required = ['yes', 'true', '1', 'y'].includes(reqStr);
            } else {
              questionData.required = false;
            }
            
            // Process options
            if (questionData.options) {
              if (typeof questionData.options === 'string') {
                questionData.options = questionData.options
                  .split(',')
                  .map((opt: string) => opt.trim())
                  .filter((opt: string) => opt !== '');
              } else {
                questionData.options = [questionData.options.toString()];
              }
            } else {
              questionData.options = [];
            }
            
            // Find or create category
            let categoryId = undefined;
            if (questionData.category && dbCategories.length > 0) {
              // Try to find matching category
              const categoryName = questionData.category.toString();
              const category = dbCategories.find(c => 
                c.name.toLowerCase() === categoryName.toLowerCase() && !c.parent_id
              );
              
              if (category) {
                categoryId = category.id;
              }
            }
            
            // Create question object
            const question = {
              text: questionData.text.toString(),
              description: questionData.description?.toString(),
              type: questionData.type,
              required: questionData.required,
              options: questionData.options,
              sectionId: categoryId,
              tags: [],
            };
            
            // Add question to database
            await addQuestion(question);
            successCount++;
          } catch (error) {
            console.error('Error adding question:', error);
            errorCount++;
          }
        }
        
        // Show results
        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} questions.`);
          
          // Refresh questions list
          await refreshQuestions();
        }
        
        if (errorCount > 0) {
          toast.error(`Failed to import ${errorCount} questions.`);
        }
        
        setImporting(false);
        onClose();
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('An error occurred during import.');
      setImporting(false);
    }
  };

  // Reset the importer
  const resetImporter = () => {
    setFile(null);
    setSheetNames([]);
    setSelectedSheet('');
    setHeaders([]);
    setPreviewData([]);
    setColumnMappings({});
    setValidationErrors([]);
    setImportStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render content based on current step
  const renderContent = () => {
    switch (importStep) {
      case 'upload':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="w-full max-w-md p-6 border-2 border-dashed rounded-lg border-gray-300 hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center gap-4" 
                onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Click to select an Excel or CSV file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: .xlsx, .xls, .csv
                </p>
              </div>
            </div>
            <Input 
              type="file" 
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button 
              variant="secondary" 
              onClick={resetImporter}
              disabled={!file}
            >
              Reset
            </Button>
          </div>
        );
      
      case 'mapping':
        return (
          <div className="py-4 space-y-6">
            {sheetNames.length > 1 && (
              <div className="space-y-2">
                <Label>Select Sheet</Label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetNames.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Column Mapping</h3>
                <Button size="sm" variant="outline" onClick={resetImporter}>
                  Change File
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Map each column in your spreadsheet to the appropriate field type.
              </p>
              
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Excel Column</TableHead>
                      <TableHead>Maps To</TableHead>
                      <TableHead>Sample Values</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headers.map((header, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell>
                          <Select 
                            value={columnMappings[index] || 'ignore'} 
                            onValueChange={(value) => updateMapping(index.toString(), value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select field type" />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {previewData.slice(0, 3).map((row, i) => (
                            <div key={i} className="truncate">{row[index]}</div>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handlePreview}>
                Preview Import
              </Button>
            </div>
          </div>
        );
      
      case 'preview':
        return (
          <div className="py-4 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Preview Import</h3>
                <Button size="sm" variant="outline" onClick={() => setImportStep('mapping')}>
                  Back to Mapping
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Review the first few questions before importing. A total of {file ? previewData.length : 0} questions will be imported.
              </p>
              
              <div className="space-y-4 max-h-[350px] overflow-y-auto">
                {previewData.map((row, rowIndex) => {
                  // Map data according to column mappings
                  const question: Record<string, any> = {};
                  Object.entries(columnMappings).forEach(([colIndex, fieldType]) => {
                    if (fieldType !== 'ignore') {
                      question[fieldType] = row[parseInt(colIndex)];
                    }
                  });
                  
                  if (!question.text) return null;
                  
                  return (
                    <div key={rowIndex} className="p-4 border rounded-md">
                      <h4 className="font-medium">{question.text}</h4>
                      {question.description && (
                        <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="text-xs bg-secondary px-2 py-1 rounded-full">
                          Type: {question.type || 'text'}
                        </div>
                        <div className="text-xs bg-secondary px-2 py-1 rounded-full">
                          {question.required ? 'Required' : 'Optional'}
                        </div>
                        {question.category && (
                          <div className="text-xs bg-secondary px-2 py-1 rounded-full">
                            Category: {question.category}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleImport}>
                Import Questions
              </Button>
            </div>
          </div>
        );
      
      case 'importing':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-lg font-medium">Importing Questions...</p>
            <p className="text-sm text-muted-foreground">Please wait while we process your file.</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Questions from Excel
          </DialogTitle>
        </DialogHeader>
        
        {renderContent()}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelImporter; 