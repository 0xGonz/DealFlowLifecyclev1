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
import { FileUp, File } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DEAL_SECTORS } from "@/lib/constants/sectors";
import { DEAL_STAGES, DealStage, DealStageLabels } from "@/lib/constants/deal-stages";

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

export default function NewDealModal({ isOpen, onClose }: NewDealModalProps) {
  const { toast } = useToast();
  const [pitchDeck, setPitchDeck] = useState<File | null>(null);
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
      setPitchDeck(e.target.files[0]);
    }
  };

  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Using standard fetch for FormData upload
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error('Failed to upload document');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Pitch deck uploaded',
        description: 'The pitch deck was successfully uploaded.',
      });
      setPitchDeck(null);
      // File input needs to be cleared manually
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: () => {
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading the pitch deck. Please try again.',
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
      
      // Upload pitch deck if available
      if (pitchDeck && dealId) {
        const formData = new FormData();
        formData.append('file', pitchDeck);
        formData.append('fileName', pitchDeck.name);
        formData.append('fileType', pitchDeck.type);
        formData.append('dealId', dealId.toString());
        formData.append('documentType', 'pitch_deck');
        formData.append('uploadedBy', '1'); // Admin user ID
        formData.append('description', 'Initial pitch deck');
        
        try {
          await uploadDocumentMutation.mutateAsync(formData);
        } catch (err) {
          console.error('Failed to upload pitch deck:', err);
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
      setPitchDeck(null); // Reset pitch deck
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] }); // Refresh deals data
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
      <DialogContent className="sm:max-w-[625px]">
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
                      <SelectContent>
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
                    <FormLabel>Target Return</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 20%" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs">
                      This will be shown in Pipeline view
                    </FormMessage>
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
              <Label>Pitch Deck (Optional)</Label>
              <div className="flex flex-col gap-2">
                {pitchDeck ? (
                  <Card className="p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <File className="h-5 w-5 mr-2 text-neutral-500" />
                      <div>
                        <p className="font-medium text-sm">{pitchDeck.name}</p>
                        <p className="text-xs text-neutral-500">{(pitchDeck.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setPitchDeck(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </Card>
                ) : (
                  <div 
                    className="border border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="h-8 w-8 mb-2 text-neutral-400" />
                    <p className="text-sm font-medium">Click to upload a pitch deck</p>
                    <p className="text-xs text-neutral-500">PDF, PPT, or PPTX (max 10MB)</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                />
              </div>
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
