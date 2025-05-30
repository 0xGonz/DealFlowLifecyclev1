const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPdfExtraction() {
  try {
    console.log('🔍 Testing PDF content extraction for Winkler document...');
    
    const pdfPath = './uploads/test-winkler-document.pdf';
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF file not found at:', pdfPath);
      return;
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('📄 PDF file size:', pdfBuffer.length, 'bytes');
    
    const pdfData = await pdfParse(pdfBuffer);
    console.log('✅ PDF parsing successful');
    console.log('📝 Extracted text length:', pdfData.text.length, 'characters');
    console.log('🔍 First 500 characters of extracted content:');
    console.log('=' .repeat(50));
    console.log(pdfData.text.substring(0, 500));
    console.log('=' .repeat(50));
    
    if (pdfData.text.includes('9201 Winkler')) {
      console.log('✅ Content contains expected Winkler property details');
    } else {
      console.log('❌ Content does not contain expected Winkler details');
    }
    
  } catch (error) {
    console.error('💥 PDF extraction failed:', error.message);
  }
}

testPdfExtraction();