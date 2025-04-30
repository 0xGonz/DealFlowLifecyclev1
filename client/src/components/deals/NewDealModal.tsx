import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EmailIngestionForm from "./EmailIngestionForm";

// Form schema with validation rules
const dealFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().min(1, "Description is required"),
  industry: z.string().min(1, "Industry is required"),
  round: z.string().optional(),
  targetRaise: z.string().optional(),
  valuation: z.string().optional(),
  leadInvestor: z.string().optional(),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  notes: z.string().optional(),
  stage: z.enum(["initial_review", "screening"]),
  tags: z.array(z.string()).optional()
});

type DealFormValues = z.infer<typeof dealFormSchema>;

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewDealModal({ isOpen, onClose }: NewDealModalProps) {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState<string>("manual");

  // Initialize form with default values
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      round: "",
      targetRaise: "",
      valuation: "",
      leadInvestor: "",
      contactEmail: "",
      notes: "",
      stage: "initial_review",
      tags: []
    }
  });

  const createDealMutation = useMutation({
    mutationFn: async (values: DealFormValues) => {
      return apiRequest("POST", "/api/deals", values);
    },
    onSuccess: (data) => {
      toast({
        title: "Deal created",
        description: "New deal has been successfully created."
      });
      form.reset(); // Reset form
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

        <Tabs defaultValue="manual" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="email">Import from Email</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
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
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Technology">Technology</SelectItem>
                            <SelectItem value="Healthcare">Healthcare</SelectItem>
                            <SelectItem value="Financial Services">Financial Services</SelectItem>
                            <SelectItem value="Renewable Energy">Renewable Energy</SelectItem>
                            <SelectItem value="Consumer Goods">Consumer Goods</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
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
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select round" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Seed">Seed</SelectItem>
                            <SelectItem value="Seed Extension">Seed Extension</SelectItem>
                            <SelectItem value="Series A">Series A</SelectItem>
                            <SelectItem value="Series B">Series B</SelectItem>
                            <SelectItem value="Series C">Series C</SelectItem>
                            <SelectItem value="Series D+">Series D+</SelectItem>
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
                          placeholder="Any initial notes or reminders" 
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
                      <FormLabel>Initial Stage</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="initial_review" id="initial-review" />
                            <Label htmlFor="initial-review">Initial Review</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="screening" id="screening" />
                            <Label htmlFor="screening">Screening</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
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
          </TabsContent>

          <TabsContent value="email">
            <EmailIngestionForm onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
