/**
 * Client-side file parsing utilities — no server, no cloud.
 * Handles .txt and .pdf files using FileReader and PDF.js.
 */

/**
 * Read a plain text file via FileReader.
 * Returns a Promise<string>.
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Read a PDF file using PDF.js (loaded via CDN in index.html).
 * Returns a Promise<string> of all extracted text (max 50 pages).
 */
export async function readPdfFile(file) {
  // pdfjsLib is loaded globally via CDN script in index.html
  const pdfjsLib = window.pdfjsLib;
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js not loaded');
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPages = Math.min(pdf.numPages, 50);
  const textParts = [];
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    textParts.push(pageText);
  }
  return textParts.join('\n');
}

/**
 * Auto-detect file type and parse accordingly.
 * Returns a Promise<string>.
 */
export async function parseFile(file) {
  if (!file) return '';
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    return readPdfFile(file);
  }
  return readTextFile(file);
}
