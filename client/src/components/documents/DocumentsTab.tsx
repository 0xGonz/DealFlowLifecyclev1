import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DocumentsProvider } from '@/context/DocumentsContext';
import { DocumentsPane } from './DocumentsPane';

interface DocumentsTabProps {
  dealId: number;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ dealId }) => {
  return (
    <Card className="h-[calc(100vh-230px)]">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-xl">Documents</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Deal-related files and attachments
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <div className="h-full">
          <DocumentsProvider>
            <DocumentsPane dealId={dealId} />
          </DocumentsProvider>
        </div>
      </CardContent>
    </Card>
  );
};