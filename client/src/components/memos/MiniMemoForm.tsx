import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

const miniMemoSchema = z.object({
  dealId: z.number().optional(),
  thesis: z.string().min(1, "Investment thesis is required"),
  risksAndMitigations: z.string().optional(),
  pricingConsideration: z.string().optional(),
  score: z.number().min(1).max(10),
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

  const form = useForm<MiniMemoFormValues>({
    resolver: zodResolver(miniMemoSchema),
    defaultValues: {
      dealId: dealId,
      thesis: "",
      risksAndMitigations: "",
      pricingConsideration: "",
      score: 5,
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

      // Submit the mini memo
      await apiRequest(`/api/deals/${finalDealId}/memos`, {
        method: "POST",
        data: {
          thesis: values.thesis,
          risksAndMitigations: values.risksAndMitigations || null,
          pricingConsideration: values.pricingConsideration || null,
          score: values.score,
        },
      });

      // Invalidate deal queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${finalDealId}`] });
      
      toast({
        title: "Success",
        description: "Mini memo has been created",
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
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create Mini-Memo</DialogTitle>
          <DialogDescription>
            Share your investment thesis and evaluation.
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

            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Score (1-10): {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Create Mini-Memo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
