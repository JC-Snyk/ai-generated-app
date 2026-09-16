import fs from 'fs';
import path from 'path';

export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
export const METADATA_PATH = path.join(UPLOAD_DIR, '.library.json');

export type StoredShelfLabel = {
  displayName: string;
  category: string;
  emoji: string;
  oneLiner: string;
  updatedAt: string;
};

export type LibraryMetadata = Record<string, StoredShelfLabel>;

/** Reject path traversal and hidden names; allow multer-style opaque IDs. */
export function safeUploadFilename(filename: string): string | null {
  if (!filename || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  const base = path.basename(filename);
  if (base !== filename || base.includes('..') || base.startsWith('.')) {
    return null;
  }
  return base;
}

export function listUploadedFiles(): string[] {
  if (!fs.existsSync(UPLOAD_DIR)) {
    return [];
  }
  return fs
    .readdirSync(UPLOAD_DIR)
    .filter((name) => name !== '.library.json' && !name.startsWith('.'))
    .sort();
}

export function uploadFilePath(filename: string): string | null {
  return resolveUploadReadPath(filename);
}

/** Opens a read stream only for files confined to the uploads directory. */
export function openUploadReadStream(filename: string): fs.ReadStream | null {
  const resolved = resolveUploadReadPath(filename);
  if (!resolved) {
    return null;
  }
  return fs.createReadStream(resolved);
}

function resolveUploadReadPath(filename: string): string | null {
  const safe = safeUploadFilename(filename);
  if (!safe) {
    return null;
  }
  const filePath = path.resolve(UPLOAD_DIR, safe);
  const uploadRoot = path.resolve(UPLOAD_DIR);
  const relative = path.relative(uploadRoot, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return filePath;
}

export function readLibraryMetadata(): LibraryMetadata {
  if (!fs.existsSync(METADATA_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8')) as LibraryMetadata;
  } catch {
    return {};
  }
}

export function writeShelfLabel(filename: string, label: Omit<StoredShelfLabel, 'updatedAt'>): StoredShelfLabel {
  const safe = safeUploadFilename(filename);
  if (!safe) {
    throw new Error('Invalid filename');
  }
  const filePath = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  const metadata = readLibraryMetadata();
  const entry: StoredShelfLabel = { ...label, updatedAt: new Date().toISOString() };
  metadata[safe] = entry;
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));
  return entry;
}
