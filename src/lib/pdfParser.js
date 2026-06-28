/**
 * PDF text extraction using pdf.js CDN — loaded dynamically so it doesn't bloat the bundle.
 * Falls back to raw byte scanning if pdf.js fails.
 */

async function extractWithPdfJs(file) {
  // Load pdf.js from CDN if not already loaded
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 80); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    pages.push(pageText);
  }
  return pages.join('\n\n');
}

function extractRawPdfText(arrayBuffer) {
  // Fallback: scan raw bytes for readable text strings inside PDF objects
  const bytes = new Uint8Array(arrayBuffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 32 && c <= 126) str += String.fromCharCode(c);
    else if (c === 10 || c === 13) str += ' ';
  }
  // Extract text between parentheses (PDF string objects) and BT/ET blocks
  const parenthetical = str.match(/\(([^()]{2,300})\)/g) || [];
  const extracted = parenthetical
    .map(m => m.slice(1, -1))
    .filter(s => /[a-zA-Z]/.test(s) && s.trim().length > 3)
    .join(' ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return extracted.length > 200 ? extracted : str.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function readFileAsText(file) {
  // Plain text files
  if (
    file.type === 'text/plain' ||
    file.name.endsWith('.txt') ||
    file.name.endsWith('.md') ||
    file.type === 'text/markdown'
  ) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => resolve(e.target.result);
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  // Word docs — read as text (basic extraction)
  if (
    file.name.endsWith('.doc') ||
    file.name.endsWith('.docx') ||
    file.type.includes('word') ||
    file.type.includes('document')
  ) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => {
        // Strip XML tags from docx content
        const raw = e.target.result || '';
        const clean = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        resolve(clean.length > 50 ? clean : raw);
      };
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  // Images — describe for AI context
  if (file.type.startsWith('image/')) {
    return `[IMAGE FILE: ${file.name}]\nThis is an image file. Analyze it based on the filename and any goal provided.`;
  }

  // PDF — try pdf.js first, fallback to raw scan
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    try {
      const text = await extractWithPdfJs(file);
      if (text && text.trim().length > 100) return text;
    } catch (e) {
      console.warn('pdf.js extraction failed, using fallback:', e);
    }
    // Fallback
    const ab = await file.arrayBuffer();
    return extractRawPdfText(ab);
  }

  // Generic fallback — read as text
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result || '');
    r.onerror = reject;
    r.readAsText(file);
  });
}
