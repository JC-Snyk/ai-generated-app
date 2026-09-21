import fs from 'fs';
import path from 'path';

/** Root of the upload vault. Matches the multer `dest: 'uploads/'` the app uses. */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export interface DocumentSummary {
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface SearchHit {
  filename: string;
  excerpt: string;
}

/**
 * Resolve a caller-supplied filename inside the upload vault.
 *
 * Tool arguments are produced by a model, so they are untrusted input: a
 * filename that resolves outside UPLOAD_DIR is rejected instead of read.
 */
export function resolveInVault(filename: string): string {
  const resolved = path.resolve(UPLOAD_DIR, filename);
  if (resolved !== UPLOAD_DIR && !resolved.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error(`Refusing to access "${filename}": outside the upload directory.`);
  }
  return resolved;
}

export function listDocuments(): DocumentSummary[] {
  if (!fs.existsSync(UPLOAD_DIR)) {
    return [];
  }
  return fs
    .readdirSync(UPLOAD_DIR)
    .filter((name) => fs.statSync(path.join(UPLOAD_DIR, name)).isFile())
    .map((name) => {
      const stats = fs.statSync(path.join(UPLOAD_DIR, name));
      return {
        filename: name,
        sizeBytes: stats.size,
        uploadedAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/**
 * Best-effort text extraction. Uploads are stored as raw bytes, so this pulls
 * out the printable runs: enough for text-bearing PDFs, and deliberately not a
 * full PDF parser (scanned or compressed documents yield little or nothing).
 */
export function readDocument(filename: string, maxChars = 20000): string {
  const filePath = resolveInVault(filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Document "${filename}" was not found in the upload directory.`);
  }
  const raw = fs.readFileSync(filePath, 'latin1');
  const text = raw
    .replace(/[^\x20-\x7E\n\r\t]+/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[truncated]` : text;
}

/** Case-insensitive substring search across every uploaded document. */
export function searchDocuments(query: string, contextChars = 160): SearchHit[] {
  const needle = query.toLowerCase();
  const hits: SearchHit[] = [];
  for (const doc of listDocuments()) {
    let text: string;
    try {
      text = readDocument(doc.filename);
    } catch {
      continue;
    }
    const index = text.toLowerCase().indexOf(needle);
    if (index !== -1) {
      const start = Math.max(0, index - contextChars);
      hits.push({
        filename: doc.filename,
        excerpt: text.slice(start, index + needle.length + contextChars),
      });
    }
  }
  return hits;
}
