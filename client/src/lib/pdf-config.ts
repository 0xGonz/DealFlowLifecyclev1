import { pdfjs } from 'react-pdf';

/**
 * Checks if a file exists by making a HEAD request
 * This is used to detect missing files before attempting to load them in the PDF viewer
 */
export const checkFileExists = async (url: string): Promise<boolean> => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

/**
 * Helper function to extract document name from path
 */
export const getDocumentNameFromPath = (path: string): string => {
  if (!path) return 'Document';
  
  try {
    // Extract just the filename without path or extension
    const filename = path.split('/').pop() || 'Document';
    return decodeURIComponent(filename.replace(/\.[^/.]+$/, ""));
  } catch (e) {
    return 'Document';
  }
};

// Export a utility object with PDF-related functions
export default {
  checkFileExists,
  getDocumentNameFromPath
};