import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Calculator, Lightbulb, Loader2 } from 'lucide-react';

interface Document {
  id: number;
  fileName: string;
  fileType: string;
  documentType?: string;
}

interface DocumentAnalysisButtonsProps {
  documents: Document[];
  dataFiles: Document[];
  onDocumentAnalysis: (document: Document) => void;
  onAnalysisType: (type: string) => void;
  disabled?: boolean;
  isAnalyzing?: boolean;
}

export function DocumentAnalysisButtons({ 
  documents, 
  dataFiles, 
  onDocumentAnalysis, 
  onAnalysisType,
  disabled = false,
  isAnalyzing = false 
}: DocumentAnalysisButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Quick Analysis Buttons */}
      <Button
        onClick={() => onAnalysisType('investment_thesis')}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
        disabled={disabled || isAnalyzing}
      >
        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
        <span className="hidden sm:inline">Investment Thesis</span>
      </Button>

      <Button
        onClick={() => onAnalysisType('risks_opportunities')}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
        disabled={disabled || isAnalyzing}
      >
        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
        <span className="hidden sm:inline">Risks & Opps</span>
      </Button>

      <Button
        onClick={() => onAnalysisType('financial_analysis')}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
        disabled={disabled}
      >
        <Calculator className="h-4 w-4" />
        <span className="hidden sm:inline">Financials</span>
      </Button>

      {/* Document-specific Analysis Buttons */}
      {documents.slice(0, 3).map((document) => (
        <Button
          key={document.id}
          onClick={() => onDocumentAnalysis(document)}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
          disabled={disabled}
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline truncate max-w-24">
            {document.fileName.split('.')[0]}
          </span>
        </Button>
      ))}

      {/* Show remaining document count if more than 3 */}
      {documents.length > 3 && (
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          disabled={disabled}
        >
          +{documents.length - 3} more
        </Button>
      )}
    </div>
  );
}