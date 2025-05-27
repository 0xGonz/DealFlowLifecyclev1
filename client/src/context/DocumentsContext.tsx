import React, { createContext, useContext, useState, Dispatch, SetStateAction } from 'react';

export interface DocMeta {
  id: number;
  name: string;
  fileName: string;
  fileType: string;
  downloadUrl: string;
  documentType?: string;
}

interface DocsCtx {
  docs: DocMeta[];
  setDocs: Dispatch<SetStateAction<DocMeta[]>>;
  current: DocMeta | null;
  setCurrent: Dispatch<SetStateAction<DocMeta | null>>;
}

const Ctx = createContext<DocsCtx | null>(null);

export const DocumentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [current, setCurrent] = useState<DocMeta | null>(null);
  return <Ctx.Provider value={{ docs, setDocs, current, setCurrent }}>{children}</Ctx.Provider>;
};

export const useDocs = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDocs must be used inside <DocumentsProvider>');
  return ctx;
};