"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_DIR = void 0;
exports.resolveInVault = resolveInVault;
exports.listDocuments = listDocuments;
exports.readDocument = readDocument;
exports.searchDocuments = searchDocuments;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** Root of the upload vault. Matches the multer `dest: 'uploads/'` the app uses. */
exports.UPLOAD_DIR = path_1.default.resolve(process.cwd(), 'uploads');
/**
 * Resolve a caller-supplied filename inside the upload vault.
 *
 * Tool arguments are produced by a model, so they are untrusted input: a
 * filename that resolves outside UPLOAD_DIR is rejected instead of read.
 */
function resolveInVault(filename) {
    const resolved = path_1.default.resolve(exports.UPLOAD_DIR, filename);
    if (resolved !== exports.UPLOAD_DIR && !resolved.startsWith(exports.UPLOAD_DIR + path_1.default.sep)) {
        throw new Error(`Refusing to access "${filename}": outside the upload directory.`);
    }
    return resolved;
}
function listDocuments() {
    if (!fs_1.default.existsSync(exports.UPLOAD_DIR)) {
        return [];
    }
    return fs_1.default
        .readdirSync(exports.UPLOAD_DIR)
        .filter((name) => fs_1.default.statSync(path_1.default.join(exports.UPLOAD_DIR, name)).isFile())
        .map((name) => {
        const stats = fs_1.default.statSync(path_1.default.join(exports.UPLOAD_DIR, name));
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
function readDocument(filename, maxChars = 20000) {
    const filePath = resolveInVault(filename);
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`Document "${filename}" was not found in the upload directory.`);
    }
    const raw = fs_1.default.readFileSync(filePath, 'latin1');
    const text = raw
        .replace(/[^\x20-\x7E\n\r\t]+/g, ' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[truncated]` : text;
}
/** Case-insensitive substring search across every uploaded document. */
function searchDocuments(query, contextChars = 160) {
    const needle = query.toLowerCase();
    const hits = [];
    for (const doc of listDocuments()) {
        let text;
        try {
            text = readDocument(doc.filename);
        }
        catch (_a) {
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
