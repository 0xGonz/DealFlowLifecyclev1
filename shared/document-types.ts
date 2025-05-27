/**
 * Centralized document type labels and utilities
 * Single source of truth for all document type display logic
 */

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'pitch_deck': 'Pitch Deck',
  'financial_model': 'Financial Model', 
  'legal_document': 'Legal Document',
  'diligence_report': 'Diligence Report',
  'investor_report': 'Investor Report',
  'term_sheet': 'Term Sheet',
  'cap_table': 'Cap Table',
  'subscription_agreement': 'Subscription Agreement',
  'other': 'Other'
};

/**
 * Pure function to get display label for document type
 * @param type - The document type from the database/API
 * @returns Human-readable label for the document type
 */
export function getDocumentTypeLabel(type: string): string {
  const label = DOCUMENT_TYPE_LABELS[type];
  if (!label) {
    console.warn(`⚠️ Unknown document type: "${type}". Using fallback "Other".`);
    return 'Other';
  }
  return label;
}

/**
 * TypeScript type for valid document types
 */
export type DocumentType = keyof typeof DOCUMENT_TYPE_LABELS;

/**
 * Get all available document type options for dropdowns/selects
 */
export function getDocumentTypeOptions(): Array<{ value: string; label: string }> {
  return Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
    value,
    label
  }));
}