import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { DEAL_SECTORS } from "@/lib/constants/sectors";
import { FUNDING_ROUNDS } from "@/lib/constants/funding-rounds";
import { DEAL_STAGES, DealStage, DealStageLabels } from "@/lib/constants/deal-stages";

// Form schema with validation rules
const dealFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().min(1, "Description is required"),
  industry: z.string().min(1, "Sector is required"),
  sector: z.string().optional(),
  round: z.string().optional(),
  targetRaise: z.string().optional(),
  valuation: z.string().optional(),
  leadInvestor: z.string().optional(),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  notes: z.string().optional(),
  stage: z.enum(DEAL_STAGES),
  rejectionReason: z.string().optional(),
  tags: z.array(z.string()).optional()
});

type DealFormValues = z.infer<typeof dealFormSchema>;

interface EditDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: number;
}

export default function EditDealModal({ isOpen, onClose, dealId }: EditDealModalProps) {
  const { toast } = useToast();

  // Fetch the deal data
  const { data: deal, isLoading } = useQuery<any>({
    queryKey: [`/api/deals/${dealId}`],
    enabled: isOpen && dealId > 0,
  });

  // Initialize form with default values
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      sector: "",
      round: "",
      targetRaise: "",
      valuation: "",
      leadInvestor: "",
      contactEmail: "",
      notes: "",
      stage: "initial_review",
      tags: []
    },
    values: deal ? {
      name: deal.name,
      description: deal.description,
      industry: deal.industry,
      sector: deal.sector || "",
      round: deal.round || "",
      targetRaise: deal.targetRaise || "",
      valuation: deal.valuation || "",
      leadInvestor: deal.leadInvestor || "",
      contactEmail: deal.contactEmail || "",
      notes: deal.notes || "",
      stage: deal.stage,
      tags: deal.tags || []
    } : undefined
  });

  // Reset form values when deal data changes
  React.useEffect(() => {
    if (deal) {
      form.reset({
        name: deal.name,
        description: deal.description,
        industry: deal.industry,
        sector: deal.sector || "",
        round: deal.round || "",
        targetRaise: deal.targetRaise || "",
        valuation: deal.valuation || "",
        leadInvestor: deal.leadInvestor || "",
        contactEmail: deal.contactEmail || "",
        notes: deal.notes || "",
        stage: deal.stage,
        tags: deal.tags || []
      });
    }
  }, [deal, form]);

  const updateDealMutation = useMutation({
    mutationFn: async (values: DealFormValues) => {
      return apiRequest("PATCH", `/api/deals/${dealId}`, values);
    },
    onSuccess: async (data: any) => {
      // Show success toast
      toast({
        title: "Deal updated",
        description: "Deal has been successfully updated."
      });
      
      // Create notification for deal update
      try {
        // Check if stage was changed
        const stageChanged = deal?.stage !== form.getValues().stage;
        
        // Generate notification for all users (using admin user ID 1 for now)
        if (stageChanged) {
          // Pass the new stage to the notification function
          await generateDealNotification(1, data.name, 'moved', dealId, form.getValues().stage);
        } else {
          await generateDealNotification(1, data.name, 'updated', dealId);
        }
        
        // Refresh notifications in the UI
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      } catch (err) {
        console.error('Failed to create notification:', err);
      }
      
      // Refresh deals data
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      
      // Close modal
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update deal. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: DealFormValues) => {
    updateDealMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
          <DialogDescription>
            Update the details for this investment opportunity.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormLabel>Sector *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
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
                    <FormLabel>Description *</FormLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="round"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Round</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select round" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FUNDING_ROUNDS.map((round) => (
                            <SelectItem key={round} value={round}>{round}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetRaise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Raise</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                            $
                          </span>
                          <Input 
                            placeholder="e.g. 10,000,000" 
                            className="pl-7" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valuation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valuation</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                            $
                          </span>
                          <Input 
                            placeholder="e.g. 50,000,000" 
                            className="pl-7" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadInvestor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Investor</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter if known" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional notes" 
                        rows={2} 
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
                    <FormLabel>Deal Stage</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          // If moving away from rejected, clear rejection reason
                          if (value !== "rejected" && form.getValues().rejectionReason) {
                            form.setValue("rejectionReason", "");
                          }
                        }}
                        defaultValue={field.value}
                        value={field.value}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
                      >
                        {Object.entries(DealStageLabels).map(([value, label]) => (
                          <div key={value} className="flex items-center space-x-2">
                            <RadioGroupItem value={value} id={`stage-${value}`} />
                            <Label htmlFor={`stage-${value}`}>{label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch("stage") === "rejected" && (
                <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rejection Reason</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please provide a reason for rejecting this deal" 
                          rows={3} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateDealMutation.isPending}
                >
                  {updateDealMutation.isPending ? "Updating..." : "Update Deal"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}