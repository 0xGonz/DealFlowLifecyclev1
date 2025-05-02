import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Deal, insertDealSchema } from "@shared/schema";
import { AlertCircle, Info } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Extend the schema for form validation
const formSchema = insertDealSchema.extend({
  name: z.string().min(1, "Deal name is required"),
  sector: z.string().min(1, "Sector is required"),
  projectedReturn: z.coerce.number().min(0, "Projected return must be a positive number"),
  contactEmail: z.string().email("Invalid email format"),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  callTarget: z.boolean().default(false),
  // We'll handle the file upload separately
});

type FormValues = z.infer<typeof formSchema>;

type DealFormProps = {
  initialData?: Deal;
  onSubmit: (data: FormValues, file?: File) => void;
  isSubmitting?: boolean;
  error?: string;
};

const DealForm: React.FC<DealFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false,
  error,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      sector: initialData.sector,
      projectedReturn: initialData.projectedReturn,
      contactEmail: initialData.contactEmail || "",
      description: initialData.description,
      notes: initialData.notes || "",
      callTarget: initialData.callTarget || false,
    } : {
      name: "",
      sector: "",
      projectedReturn: 0,
      contactEmail: "",
      description: "",
      notes: "",
      callTarget: false,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setFileError("");
      } else {
        setFileError("Please upload a PDF file");
        setFile(null);
      }
    }
  };

  const handleSubmit = (values: FormValues) => {
    // For new deals, require a file upload
    if (!initialData && !file) {
      setFileError("Please upload a pitch deck (PDF)");
      return;
    }
    
    onSubmit(values, file || undefined);
  };

  const sectors = [
    "Software", 
    "Healthcare", 
    "Fintech", 
    "E-commerce", 
    "Enterprise", 
    "Consumer", 
    "Hardware", 
    "Real Estate", 
    "Biotech", 
    "Clean Energy",
    "Edtech",
    "Logistics"
  ];

  return (
    <Form {...form}>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    {sectors.map((sector) => (
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
            name="projectedReturn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projected Return*</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 2.5" 
                    {...field} 
                    step="0.1"
                  />
                </FormControl>
                <FormDescription>Multiple on invested capital (e.g., 2.5x)</FormDescription>
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
                  <Input type="email" placeholder="Enter contact email" {...field} />
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
                  placeholder="Enter a detailed description of the deal" 
                  {...field} 
                  rows={5}
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
                  placeholder="Any additional notes or comments" 
                  {...field} 
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormLabel>Pitch Deck (PDF)*</FormLabel>
          <Input 
            type="file" 
            onChange={handleFileChange} 
            accept="application/pdf" 
          />
          {fileError && (
            <p className="text-sm font-medium text-destructive">{fileError}</p>
          )}
          {!fileError && file && (
            <p className="text-sm text-muted-foreground">
              Selected file: {file.name}
            </p>
          )}
          {initialData && !file && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Info className="mr-2 h-4 w-4" />
              <span>Current pitch deck available. Upload a new one to replace it.</span>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="callTarget"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                </div>
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Mark as call target
                </FormLabel>
                <FormDescription>
                  This deal will be highlighted in the pipeline for follow-up
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>Save Deal</>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default DealForm;
