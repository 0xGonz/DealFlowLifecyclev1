import { Job } from 'bull';
import { JobQueueService } from '../services/JobQueue';
import { StorageFactory } from '../storage-factory';

/**
 * Interface for document processing job data
 */
interface DocumentProcessingJob {
  documentId: number;
  type: 'ocr' | 'analysis' | 'conversion';
  options?: {
    targetFormat?: string;
    extractText?: boolean;
    extractTables?: boolean;
    extractMetadata?: boolean;
  };
}

/**
 * Process a document asynchronously
 */
async function processDocument(job: Job<DocumentProcessingJob>) {
  const { documentId, type, options } = job.data;
  
  // Log processing start
  console.log(`Starting document processing: ${documentId} (${type})`);
  job.progress(10);
  
  try {
    // Get the document from storage
    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    job.progress(20);
    
    // Process the document based on the job type
    let result: any;
    
    switch (type) {
      case 'ocr':
        // Simulate OCR processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = { 
          success: true, 
          text: `Extracted text from ${document.fileName}`,
          confidence: 0.95
        };
        break;
        
      case 'analysis':
        // Simulate document analysis time
        await new Promise(resolve => setTimeout(resolve, 3000));
        result = {
          success: true,
          topics: ['finance', 'investment'],
          entities: ['Company X', 'Company Y'],
          summary: `This is a summary of ${document.fileName}`
        };
        break;
        
      case 'conversion':
        // Simulate document conversion time
        await new Promise(resolve => setTimeout(resolve, 1500));
        const targetFormat = options?.targetFormat || 'pdf';
        result = {
          success: true,
          convertedFilePath: `${document.filePath}.${targetFormat}`,
          originalFormat: document.fileType,
          targetFormat
        };
        break;
        
      default:
        throw new Error(`Unknown document processing type: ${type}`);
    }
    
    job.progress(80);
    
    // Create a timeline event to record the processing
    await storage.createTimelineEvent({
      dealId: document.dealId,
      eventType: 'document_upload',
      content: `Document ${document.fileName} processed (${type})`,
      createdBy: 1, // System user
      metadata: { 
        documentId,
        processingType: type,
        result 
      }
    });
    
    job.progress(100);
    console.log(`Document processing completed: ${documentId} (${type})`);
    
    return result;
  } catch (error) {
    console.error(`Document processing failed: ${documentId} (${type})`, error);
    throw error;
  }
}

/**
 * Initialize the document processing queue
 */
export function initDocumentProcessingQueue() {
  const jobQueueService = JobQueueService.getInstance();
  
  // Register document processing handler
  jobQueueService.processQueue(
    JobQueueService.QUEUES.DOCUMENT_PROCESSING,
    2, // Process 2 jobs concurrently
    processDocument
  );
  
  console.log('Document processing queue initialized');
}

/**
 * Add a document to the processing queue
 */
export async function queueDocumentForProcessing(
  documentId: number,
  type: 'ocr' | 'analysis' | 'conversion',
  options?: DocumentProcessingJob['options']
) {
  const jobQueueService = JobQueueService.getInstance();
  
  const job = await jobQueueService.addJob(
    JobQueueService.QUEUES.DOCUMENT_PROCESSING,
    {
      documentId,
      type,
      options
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  );
  
  console.log(`Document queued for processing: ${documentId} (${type}), job ID: ${job.id}`);
  return job;
}