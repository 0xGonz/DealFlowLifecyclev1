import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { insertDealSchema, Deal } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DealFormProps {
  initialData?: Deal;
  onSubmit: (data: any, file?: File) => void;
  isSubmitting?: boolean;
  error?: string;
}

const sectorOptions = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer',
  'Industrial',
  'Real Estate',
  'Energy',
  'Telecom',
  'Materials',
  'Utilities',
  'Renewable Energy',
  'Media & Entertainment',
  'Education',
  'Retail',
  'Transportation',
  'Other'
];

const roundOptions = [
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Series D+',
  'Growth',
  'Late Stage',
  'Pre-IPO',
  'Acquisition',
  'Other'
];

const DealForm: React.FC<DealFormProps> = ({ initialData, onSubmit, isSubmitting, error }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Extend the insertDealSchema with additional validation
  const formSchema = z.object({
    name: z.string().min(2, 'Deal name must be at least 2 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    sector: z.string().min(1, 'Please select a sector'),
    round: z.string().min(1, 'Please select a round'),
    targetRaise: z.string().optional(),
    valuation: z.string().optional(),
    leadInvestor: z.string().optional(),
    projectedReturn: z.coerce.number()
      .min(0.1, 'Projected return must be greater than 0')
      .default(1.0),
    contactEmail: z.string().email('Please enter a valid email'),
    notes: z.string().optional(),
    callTarget: z.boolean().default(false),
    createdBy: z.number().default(1), // Default to admin user ID
    stage: z.enum([
      'initial_review',
      'screening',
      'diligence',
      'ic_review',
      'closing',
      'closed',
      'invested',
      'rejected'
    ]).default('initial_review'),
    tags: z.array(z.string()).optional()
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      sector: initialData?.sector || '',
      round: initialData?.round || 'Seed',
      targetRaise: initialData?.targetRaise || '',
      valuation: initialData?.valuation || '',
      leadInvestor: initialData?.leadInvestor || '',
      projectedReturn: initialData?.projectedReturn || 1.0,
      contactEmail: initialData?.contactEmail || '',
      notes: initialData?.notes || '',
      callTarget: initialData?.callTarget || false,
      createdBy: initialData?.createdBy || 1,
      stage: initialData?.stage || 'initial_review',
      tags: initialData?.tags || []
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    // Reset the file input
    const fileInput = document.getElementById('pitch-deck') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleFormSubmit = (data: FormValues) => {
    onSubmit(data, selectedFile || undefined);
  };

  return (
    <div className="space-y-4 py-2 pb-4">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter deal name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sectorOptions.map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="round"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Round*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a round" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roundOptions.map((round) => (
                          <SelectItem key={round} value={round}>
                            {round}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="targetRaise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Raise</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., $10M" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valuation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valuation</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., $50M post-money" {...field} />
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
                      <Input placeholder="e.g., Sequoia Capital" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="projectedReturn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projected Return Multiple*</FormLabel>
                    <FormControl>
                      <Input type="number" min="0.1" step="0.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Expected return multiple (e.g., 2.5x)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email*</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@company.com" {...field} />
                    </FormControl>
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
                  <FormLabel>Description*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the deal and company"
                      className="min-h-[120px]"
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
                      placeholder="Additional notes about the deal"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="callTarget"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Call Target</FormLabel>
                    <FormDescription>
                      Mark as a high-priority deal to be called directly
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Pitch Deck</FormLabel>
              {!selectedFile ? (
                <div className="mt-2">
                  <label
                    htmlFor="pitch-deck"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 p-6 transition-all hover:border-primary"
                  >
                    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                      <Upload className="h-8 w-8 mb-2" />
                      <span className="font-medium">Click to upload</span>
                      <span>PDF, PPT, or PPTX (max 50MB)</span>
                    </div>
                    <Input
                      id="pitch-deck"
                      type="file"
                      accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 rounded-md border p-2">
                  <div className="flex-1 truncate">{selectedFile.name}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleFileRemove}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : initialData ? (
                'Update Deal'
              ) : (
                'Create Deal'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default DealForm;
