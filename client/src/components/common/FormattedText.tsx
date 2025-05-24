import React from 'react';

interface FormattedTextProps {
  content: string;
  className?: string;
}

export function FormattedText({ content, className = '' }: FormattedTextProps) {
  // Convert markdown-style formatting to HTML
  const formatText = (text: string): string => {
    let formatted = text;
    
    // Convert headers (### -> h3, ## -> h2, # -> h1) - Remove hashtags completely
    formatted = formatted.replace(/^###\s*(.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>');
    formatted = formatted.replace(/^##\s*(.+)$/gm, '<h2 class="text-xl font-semibold text-gray-900 mt-5 mb-3">$1</h2>');
    formatted = formatted.replace(/^#\s*(.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-3">$1</h1>');
    
    // Convert bold text (**text** -> <strong>)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // Convert italic text (*text* -> <em>)
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800">$1</em>');
    
    // Convert bullet points (- item -> simple div)
    formatted = formatted.replace(/^- (.+)$/gm, '<div class="text-gray-700 mb-1">• $1</div>');
    
    // Convert numbered lists (1. item -> simple div)
    formatted = formatted.replace(/^\d+\. (.+)$/gm, '<div class="text-gray-700 mb-1">• $1</div>');
    
    // Clean up excessive line breaks and convert remaining ones
    formatted = formatted.replace(/\n{3,}/g, '\n\n'); // Reduce multiple line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p class="mb-1">');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags if not already wrapped in HTML
    if (formatted && !formatted.includes('<')) {
      formatted = `<p class="mb-1">${formatted}</p>`;
    } else if (formatted && !formatted.startsWith('<')) {
      formatted = `<p class="mb-1">${formatted}</p>`;
    }
    
    return formatted;
  };

  return (
    <div 
      className={`max-w-none ${className}`}
      style={{ color: 'inherit' }}
      dangerouslySetInnerHTML={{ 
        __html: formatText(content) 
      }}
    />
  );
}

export default FormattedText;