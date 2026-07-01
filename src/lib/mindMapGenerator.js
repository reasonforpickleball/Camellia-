/**
 * Generate a hierarchical mind-map data structure from raw text.
 * Pure client-side — no external calls.
 * Produces clean, complete concept labels — no sentence fragments.
 */

import { extractSections } from './plannerAlgorithm';

const BRANCH_COLORS = ['#7b2d6e','#E07B39','#2AACB8','#C2185B','#7B5E8B','#5C3D2E','#E53935','#388E3C'];

// Strip metadata noise from text
function cleanMetadata(text) {
  return text
    .split('\n')
    .filter(line => {
      const l = line.trim();
      if (!l) return false;
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(l)) return false;
      if (/^(date|author|created|modified|file|version|page|by|from|source|updated)[\s:]/i.test(l)) return false;
      if (/^\w+\s+\d{1,2},?\s+\d{4}/.test(l)) return false;
      if (/^\d{4}-\d{2}-\d{2}/.test(l)) return false;
      return true;
    })
    .join('\n');
}

// Extract a short, complete label from a sentence — keeps full sentences
// instead of chopping mid-word into meaningless fragments.
function extractLabel(text) {
  if (!text) return '';
  const t = text.trim().replace(/^[-•*#>\d.]+\s*/, '').trim();
  // If text is already a short, complete sentence, use it as-is
  if (t.length <= 60) return t;
  // Prefer a complete sentence (ending in . ! or ?) if reasonably short
  const sentenceMatch = t.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch && sentenceMatch[0].trim().length <= 90) return sentenceMatch[0].trim();
  // Otherwise trim to the nearest full word under ~80 chars (no mid-word cuts)
  const truncated = t.slice(0, 80);
  const lastSpace = truncated.lastIndexOf(' ');
  const clean = lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated;
  return clean.trim() + '…';
}

export function generateMindMap(rawText) {
  if (!rawText || rawText.trim().length < 20) {
    return { central: 'Upload material to generate mind map', branches: [] };
  }

  const cleaned = cleanMetadata(rawText);
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);

  // Central node: first heading or first meaningful line
  const headingLine = lines.find(l => l.length > 4 && l.length < 80 && /^#{1,3}\s+/.test(l));
  const firstLine = headingLine || lines.find(l => l.length > 5 && !/^\d/.test(l)) || 'Main Topic';
  const central = extractLabel(firstLine.replace(/^[#\-*>]+\s*/, '').trim()).slice(0, 60);

  let sections = [];
  try { sections = extractSections(cleaned) || []; } catch {}

  // Fallback: split by paragraphs
  if (!sections || sections.length < 2) {
    const paras = cleaned.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 40);
    if (paras.length >= 2) {
      sections = paras.slice(0, 8).map((p, i) => {
        const firstSentence = p.split(/[.!?]\s+/)[0] || p;
        const header = extractLabel(firstSentence) || `Topic ${i + 1}`;
        return { id: `branch_${i}`, header, content: [p] };
      });
    }
  }

  // Last resort: group every 5 lines into a branch
  if (!sections || sections.length < 2) {
    sections = [];
    for (let i = 0; i < lines.length && sections.length < 8; i += 5) {
      const chunk = lines.slice(i, i + 5);
      const header = extractLabel(chunk[0]) || `Topic ${sections.length + 1}`;
      sections.push({ id: `branch_${sections.length}`, header, content: chunk.slice(1) });
    }
  }

  // Build branches with clean, complete concept labels
  const branches = sections.slice(0, 8).map((sec, i) => {
    const fullText = (Array.isArray(sec.content) ? sec.content : [sec.content || '']).join(' ');

    // Extract complete sentences as source for nodes
    const sentences = fullText.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 15) || [];
    
    // Also try bullet/list items
    const bullets = fullText.split(/\n/).map(l => l.trim().replace(/^[-•*]\s*/, '')).filter(l => l.length > 10 && l.length < 200);
    
    const sources = sentences.length >= 2 ? sentences : (bullets.length >= 2 ? bullets : [fullText]);

    const nodes = [];
    const seen = new Set();

    for (const src of sources.slice(0, 4)) {
      const label = extractLabel(src);
      if (!label || label.length < 3 || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      nodes.push({
        id: `node_${i}_${nodes.length}`,
        label: label.slice(0, 60),
        description: src.replace(/\s+/g, ' ').slice(0, 200),
        branchId: sec.id,
      });
    }

    // Guarantee at least 1 node
    if (nodes.length === 0) {
      nodes.push({
        id: `node_${i}_0`,
        label: sec.header.slice(0, 30),
        description: sec.header,
        branchId: sec.id,
      });
    }

    return {
      id: sec.id || `branch_${i}`,
      label: sec.header.slice(0, 28),
      color: BRANCH_COLORS[i % BRANCH_COLORS.length],
      nodes,
    };
  }).filter(b => b && b.label && b.nodes.length > 0);

  return { central, branches };
}

export function computeLayout(branches, width = 1800, height = 1400) {
  const cx = width / 2;
  const cy = height / 2;
  const N = branches.length;
  // Much larger radii so branches and nodes don't overlap
  const branchRadius = Math.max(380, Math.min(width, height) * 0.32);
  const nodeRadius = Math.max(220, 260 - N * 10);

  const branchPositions = [];
  const nodePositions = [];

  branches.forEach((branch, i) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    const bx = cx + Math.cos(angle) * branchRadius;
    const by = cy + Math.sin(angle) * branchRadius;
    branchPositions.push({ x: bx, y: by, angle });

    const M = branch.nodes.length;
    branch.nodes.forEach((node, j) => {
      // Fan nodes outward from branch, with enough angular spread to avoid overlap
      const fanSpread = Math.min(0.55, 1.2 / Math.max(M, 1));
      const spread = M <= 1 ? 0 : (j - (M - 1) / 2) * fanSpread;
      const subAngle = angle + spread;
      const sx = bx + Math.cos(subAngle) * nodeRadius;
      const sy = by + Math.sin(subAngle) * nodeRadius;
      nodePositions.push({ id: node.id, x: sx, y: sy });
    });
  });

  return { centralPos: { x: cx, y: cy }, branchPositions, nodePositions };
}
