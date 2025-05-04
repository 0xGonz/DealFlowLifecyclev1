import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/context/auth-context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@shared/schema";

export const DUE_DILIGENCE_CHECKLIST = {
  financialReview: 'Financial Review',
  legalReview: 'Legal Review',
  marketAnalysis: 'Market Analysis',
  teamAssessment: 'Team Assessment', 
  customerInterviews: 'Customer Interviews',
  competitorAnalysis: 'Competitor Analysis',
  technologyReview: 'Technology Review',
  businessModelValidation: 'Business Model Validation',
  regulatoryCompliance: 'Regulatory Compliance',
  esgAssessment: 'ESG Assessment'
};

const miniMemoSchema = z.object({
  dealId: z.number().optional(),
  thesis: z.string().min(1, "Investment thesis is required"),
  risksAndMitigations: z.string().optional(),
  pricingConsideration: z.string().optional(),
  score: z.number().min(1).max(10),
  // New fields for enhanced evaluation
  marketRiskScore: z.number().min(1).max(10).optional(),
  executionRiskScore: z.number().min(1).max(10).optional(),
  teamStrengthScore: z.number().min(1).max(10).optional(),
  productFitScore: z.number().min(1).max(10).optional(),
  valuationScore: z.number().min(1).max(10).optional(),
  competitiveAdvantageScore: z.number().min(1).max(10).optional(),
  dueDiligenceChecklist: z.record(z.boolean()).optional(),
});

type MiniMemoFormValues = z.infer<typeof miniMemoSchema>;

interface MiniMemoFormProps {
  isOpen: boolean;
  onClose: () => void;
  dealId?: number;
}

export default function MiniMemoForm({ isOpen, onClose, dealId }: MiniMemoFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedDealId, setSelectedDealId] = useState<number | null>(dealId || null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Get current user
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("thesis");
  
  // Fetch all users for team member selection
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen
  });

  // Fetch deals if no dealId is provided
  useEffect(() => {
    if (!dealId && isOpen) {
      setLoading(true);
      fetch('/api/deals')
        .then(res => res.json())
        .then(data => {
          setDeals(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch deals", err);
          setLoading(false);
        });
    }
  }, [dealId, isOpen]);
  
  // Initialize due diligence checklist
  const initialChecklist: Record<string, boolean> = {};
  Object.keys(DUE_DILIGENCE_CHECKLIST).forEach(key => {
    initialChecklist[key] = false;
  });

  const form = useForm<MiniMemoFormValues>({
    resolver: zodResolver(miniMemoSchema),
    defaultValues: {
      dealId: dealId,
      thesis: "",
      risksAndMitigations: "",
      pricingConsideration: "",
      score: 5,
      marketRiskScore: 5 as number,
      executionRiskScore: 5 as number,
      teamStrengthScore: 5 as number,
      productFitScore: 5 as number,
      valuationScore: 5 as number,
      competitiveAdvantageScore: 5 as number,
      dueDiligenceChecklist: initialChecklist,
    },
  });

  const onSubmit = async (values: MiniMemoFormValues) => {
    try {
      const finalDealId = values.dealId || selectedDealId;
      if (!finalDealId) {
        toast({
          title: "Error",
          description: "Please select a deal",
          variant: "destructive"
        });
        return;
      }

      // Find selected team member
      const finalUserId = selectedUserId || user?.id;
      const teamMember = users.find(u => u.id === finalUserId) || user;

      // Get all the assessment scores
      const assessmentData = {
        userId: finalUserId,
        username: teamMember?.username || user?.username,
        userFullName: teamMember?.fullName || user?.fullName,
        marketRiskScore: values.marketRiskScore,
        executionRiskScore: values.executionRiskScore,
        teamStrengthScore: values.teamStrengthScore,
        productFitScore: values.productFitScore,
        valuationScore: values.valuationScore,
        competitiveAdvantageScore: values.competitiveAdvantageScore,
        dueDiligenceChecklist: values.dueDiligenceChecklist,
        timestamp: new Date().toISOString(),
      };

      // Store the assessment data in the thesis field as JSON to work with existing schema
      // This is a temporary solution until we can migrate the database
      const enhancedThesis = `${values.thesis}\n\n---ASSESSMENT_DATA---\n${JSON.stringify(assessmentData)}`;
      
      // Submit the mini memo
      await apiRequest('POST', `/api/deals/${finalDealId}/memos`, {
        thesis: enhancedThesis,
        risksAndMitigations: values.risksAndMitigations || null,
        pricingConsideration: values.pricingConsideration || null,
        score: values.score,
      });

      // Invalidate deal queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${finalDealId}`] });
      
      const submitterName = teamMember?.fullName || teamMember?.username || user?.fullName || 'selected team member';
      toast({
        title: "Success",
        description: `Mini memo has been created by ${submitterName}`,
      });

      // Close form and redirect if needed
      onClose();
      if (!dealId && finalDealId) {
        navigate(`/deals/${finalDealId}?tab=memos`);
      }
    } catch (error) {
      console.error("Failed to create mini memo", error);
      toast({
        title: "Error",
        description: "Failed to create mini memo",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>Create Collaborative Mini-Memo</DialogTitle>
          <DialogDescription>
            Share your investment thesis and detailed evaluation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!dealId && (
              <FormField
                control={form.control}
                name="dealId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Deal</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => {
                          const id = parseInt(e.target.value, 10);
                          setSelectedDealId(id);
                          field.onChange(id);
                        }}
                        value={field.value || ""}
                        disabled={loading}
                      >
                        <option value="">Select a deal...</option>
                        {deals.map((deal) => (
                          <option key={deal.id} value={deal.id}>
                            {deal.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Team member selector */}
            <div className="flex items-center gap-4 bg-neutral-50 p-3 rounded-md">
              <div className="flex-1">
                <FormLabel className="block mb-2">Team Member</FormLabel>
                <Select value={selectedUserId?.toString() || (user?.id.toString() || "")} onValueChange={(value) => setSelectedUserId(Number(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((teamMember) => (
                      <SelectItem key={teamMember.id} value={teamMember.id.toString()}>
                        {teamMember.fullName || teamMember.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-shrink-0">
                <Avatar className="h-12 w-12 border-2 border-primary-100">
                  <AvatarFallback className="bg-primary-100 text-primary-800">
                    {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : (user?.username ? user.username.substring(0, 2).toUpperCase() : "U")}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-full mb-2">
                <TabsTrigger value="thesis">Thesis & Detail</TabsTrigger>
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="diligence">Due Diligence</TabsTrigger>
              </TabsList>

              <TabsContent value="thesis" className="space-y-4">
                <FormField
                  control={form.control}
                  name="thesis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Thesis *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Outline your investment thesis for this deal"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="risksAndMitigations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risks & Mitigations</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe key risks and potential mitigations"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricingConsideration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Considerations</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Discuss pricing and valuation considerations"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="assessment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="marketRiskScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Market Risk: {field.value || 5}</FormLabel>
                        <FormDescription className="text-xs">Lower score = higher risk</FormDescription>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="executionRiskScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Execution Risk: {field.value || 5}</FormLabel>
                        <FormDescription className="text-xs">Lower score = higher risk</FormDescription>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teamStrengthScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Strength: {field.value || 5}</FormLabel>
                        <FormDescription className="text-xs">Higher score = stronger team</FormDescription>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productFitScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Market Fit: {field.value || 5}</FormLabel>
                        <FormDescription className="text-xs">Higher score = better fit</FormDescription>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valuationScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valuation: {field.value || 5}</FormLabel>
                        <FormDescription className="text-xs">Higher score = more attractive valuation</FormDescription>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="competitiveAdvantageScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competitive Advantage: {field.value || 5}</FormLabel>
                        <FormDescription className="text-xs">Higher score = stronger advantage</FormDescription>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem className="pt-4 border-t border-gray-200">
                      <FormLabel className="text-base font-medium">Overall Score: {field.value}</FormLabel>
                      <FormDescription>Your overall assessment of the investment opportunity</FormDescription>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[5]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="mt-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="diligence" className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Due Diligence Checklist</Label>
                  <p className="text-xs text-gray-500 mb-3">Check items that have been completed</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(DUE_DILIGENCE_CHECKLIST).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox 
                          id={key} 
                          checked={form.watch(`dueDiligenceChecklist.${key}`)} 
                          onCheckedChange={(checked) => {
                            form.setValue(`dueDiligenceChecklist.${key}`, checked as boolean);
                          }}
                        />
                        <Label htmlFor={key} className="text-sm font-normal">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {(() => {
                  const teamMember = selectedUserId 
                    ? users.find(u => u.id === selectedUserId) 
                    : user;
                  return teamMember 
                    ? `Submit as ${teamMember.fullName || teamMember.username}` 
                    : 'Create Mini-Memo';
                })()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
