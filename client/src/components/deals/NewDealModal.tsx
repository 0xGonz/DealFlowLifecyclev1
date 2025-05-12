import { useState, useRef } from 'react';
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateDealNotification } from "@/lib/utils/notification-utils";
import { FileUp, File, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DEAL_SECTORS } from "@/lib/constants/sectors";
import { DEAL_STAGES, DealStage, DealStageLabels } from "@/lib/constants/deal-stages";
import { Badge } from "@/components/ui/badge";

// Form schema with validation rules
const dealFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional().or(z.literal("")),
  sector: z.string().optional().or(z.literal("")),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  targetReturn: z.string().optional().or(z.literal("")),
  // Removed projectedIrr - using targetReturn instead
  projectedMultiple: z.string().optional().or(z.literal("")),
  stage: z.enum(DEAL_STAGES),
  tags: z.array(z.string()).optional()
});

type DealFormValues = z.infer<typeof dealFormSchema>;

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Document types and labels
const DOCUMENT_TYPES = {
  pitch_deck: 'Pitch Deck',
  financial_model: 'Financial Model',
  legal_document: 'Legal Document',
  diligence_report: 'Diligence Report',
  investor_update: 'Investor Update',
  other: 'Other'
};

// Interface for document upload entry
interface DocumentUpload {
  file: File;
  type: keyof typeof DOCUMENT_TYPES;
  description: string;
}

export default function NewDealModal({ isOpen, onClose }: NewDealModalProps) {
  const { toast } = useToast();
  const [documentUploads, setDocumentUploads] = useState<DocumentUpload[]>([]);
  const [currentDocType, setCurrentDocType] = useState<keyof typeof DOCUMENT_TYPES>('pitch_deck');
  const [currentDocDescription, setCurrentDocDescription] = useState('');
  const [showDocUploadForm, setShowDocUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with default values
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sector: "",
      contactEmail: "",
      notes: "",
      targetReturn: "",
      projectedMultiple: "",
      stage: "initial_review",
      tags: []
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Add the new document to the list
      const newDoc: DocumentUpload = {
        file: e.target.files[0],
        type: currentDocType,
        description: currentDocDescription || `${DOCUMENT_TYPES[currentDocType]} for deal`
      };
      
      setDocumentUploads([...documentUploads, newDoc]);
      
      // Reset the form
      setCurrentDocDescription('');
      setShowDocUploadForm(false);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeDocument = (index: number) => {
    const updatedDocs = [...documentUploads];
    updatedDocs.splice(index, 1);
    setDocumentUploads(updatedDocs);
  };

  const uploadDocumentMutation = useMutation({
    mutationFn: async (params: { formData: FormData, type: string, dealId?: number }) => {
      console.log(`Uploading document of type: ${params.type}${params.dealId ? ` for deal ${params.dealId}` : ''}`);
      
      // Log the formData contents for debugging (except the file itself)
      const formDataEntries = Array.from(params.formData.entries());
      const formDataLog = formDataEntries
        .filter(([key]) => key !== 'file')
        .map(([key, value]) => `${key}: ${value}`);
      console.log('FormData contents:', formDataLog);
      
      // Using standard fetch for FormData upload
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: params.formData,
        credentials: 'include' // Ensure cookies are sent for authentication
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Document upload response error:', errorText);
        throw new Error(`Failed to upload document: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (result, variables) => {
      console.log(`Successfully uploaded document of type: ${variables.type}`, result);
      
      toast({
        title: 'Document uploaded',
        description: `The ${DOCUMENT_TYPES[variables.type as keyof typeof DOCUMENT_TYPES]} was successfully uploaded.`,
      });
    },
    onError: (error, variables) => {
      console.error(`Error uploading ${variables.type} document:`, error);
      
      toast({
        title: 'Upload failed',
        description: `There was an error uploading the ${DOCUMENT_TYPES[variables.type as keyof typeof DOCUMENT_TYPES]}. Please try again.`,
        variant: 'destructive',
      });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (values: DealFormValues) => {
      return apiRequest("POST", "/api/deals", values);
    },
    onSuccess: async (response) => {
      // Extract the created deal data from the response
      const dealData = response as any; // Cast to any for now to access id
      const dealId = dealData.id;
      const dealName = form.getValues('name'); // Get the deal name from the form
      
      // Show success toast
      toast({
        title: "Deal created",
        description: "New deal has been successfully created."
      });
      
      // Upload all documents if available
      if (documentUploads.length > 0 && dealId) {
        console.log(`Uploading ${documentUploads.length} documents for new deal ${dealId}`);
        
        // Keep track of successful uploads for toast notification summary
        let successCount = 0;
        let failCount = 0;
        
        for (const doc of documentUploads) {
          const formData = new FormData();
          // The file must be appended with the key 'file' as expected by multer
          formData.append('file', doc.file);
          
          // These parameters are required by the server's document upload handler
          formData.append('dealId', dealId.toString());
          formData.append('documentType', doc.type);
          
          // Optional description field
          if (doc.description) {
            formData.append('description', doc.description);
          }
          
          try {
            console.log(`Starting upload for ${doc.file.name} (${doc.type}) to deal ${dealId}`);
            const result = await uploadDocumentMutation.mutateAsync({ 
              formData: formData,
              type: doc.type,
              dealId: dealId
            });
            console.log('Document upload response:', result);
            
            // Log successful document upload
            if (result && result.id) {
              console.log(`Uploaded document ${result.id} (${result.fileName || 'unnamed'}) successfully`);
              
              // Invalidate document queries to ensure fresh data on next access
              queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
              if (result.dealId) {
                queryClient.invalidateQueries({ queryKey: [`/api/documents/deal/${result.dealId}`] });
              }
            }
            
            successCount++;
          } catch (err) {
            console.error(`Failed to upload ${doc.type}:`, err);
            failCount++;
            
            // Show a toast notification for the error
            toast({
              title: `Failed to upload ${DOCUMENT_TYPES[doc.type]}`,
              description: err instanceof Error ? err.message : 'An unknown error occurred',
              variant: 'destructive'
            });
          }
        }
        
        // Show a summary toast if there were successful uploads
        if (successCount > 0) {
          toast({
            title: `${successCount} document${successCount > 1 ? 's' : ''} uploaded successfully`,
            description: failCount > 0 
              ? `${failCount} document${failCount > 1 ? 's' : ''} failed to upload. Please try again.` 
              : `All documents were uploaded successfully.`
          });
        }
      }
      
      // Create notification for new deal
      try {
        // Generate notification for all users (using admin user ID 1 for now)
        // In a real-world scenario, we would notify relevant team members or all users
        await generateDealNotification(1, dealName, 'created', dealId);
        
        // Refresh notifications in the UI
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      } catch (err) {
        console.error('Failed to create notification:', err);
      }
      
      form.reset(); // Reset form
      setDocumentUploads([]); // Reset document uploads
      setCurrentDocDescription('');
      setCurrentDocType('pitch_deck');
      setShowDocUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh all relevant data
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] }); // Refresh deals data
      
      // Invalidate document queries for this specific deal
      // This ensures documents will appear immediately in the DocumentList component
      queryClient.invalidateQueries({ queryKey: [`/api/documents/deal/${dealId}`] });
      
      // Also invalidate any other document-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      console.log(`Invalidated queries for deal and documents after creation of deal ${dealId}`);
      
      onClose(); // Close modal
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create deal. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: DealFormValues) => {
    createDealMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Deal</DialogTitle>
          <DialogDescription>
            Enter details for the new investment opportunity.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {DEAL_SECTORS.map((sector) => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of company" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="contact@company.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetReturn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Return (%)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 20" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="projectedMultiple"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projected Multiple (x)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 2.5" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any initial notes or reminders" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Initial Stage</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
                    >
                      {/* Only show initial stages for new deals */}
                      {['initial_review', 'screening'].map((value) => (
                        <div key={value} className="flex items-center space-x-2">
                          <RadioGroupItem value={value} id={`stage-${value}`} />
                          <Label htmlFor={`stage-${value}`}>{DealStageLabels[value as DealStage]}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Documents</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDocUploadForm(true)}
                  className="text-xs h-7 px-2"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Document
                </Button>
              </div>
              
              {/* Document list */}
              {documentUploads.length > 0 ? (
                <div className="space-y-2">
                  {documentUploads.map((doc, index) => (
                    <Card key={index} className="p-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <File className="h-5 w-5 mr-2 text-neutral-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{doc.file.name}</p>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {DOCUMENT_TYPES[doc.type]}
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-500">{(doc.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeDocument(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-neutral-500 bg-neutral-50 rounded-md">
                  <p className="text-sm">No documents added yet.</p>
                </div>
              )}
              
              {/* Document upload form */}
              {showDocUploadForm && (
                <Card className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Add Document</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={() => setShowDocUploadForm(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="docType">Document Type</Label>
                      <Select 
                        value={currentDocType} 
                        onValueChange={(value: keyof typeof DOCUMENT_TYPES) => setCurrentDocType(value)}
                      >
                        <SelectTrigger id="docType" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="docDescription">Description (optional)</Label>
                      <Input
                        id="docDescription"
                        value={currentDocDescription}
                        onChange={(e) => setCurrentDocDescription(e.target.value)}
                        placeholder="Brief description of this document"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label>File</Label>
                      <div 
                        className="mt-1 border border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileUp className="h-6 w-6 mb-2 text-neutral-400" />
                        <p className="text-sm font-medium">Click to select a file</p>
                        <p className="text-xs text-neutral-500">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, etc.</p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      />
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDealMutation.isPending}
              >
                {createDealMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
