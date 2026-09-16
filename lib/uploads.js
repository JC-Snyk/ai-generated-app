"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.METADATA_PATH = exports.UPLOAD_DIR = void 0;
exports.safeUploadFilename = safeUploadFilename;
exports.listUploadedFiles = listUploadedFiles;
exports.uploadFilePath = uploadFilePath;
exports.openUploadReadStream = openUploadReadStream;
exports.readLibraryMetadata = readLibraryMetadata;
exports.writeShelfLabel = writeShelfLabel;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.UPLOAD_DIR = path_1.default.join(__dirname, '..', 'uploads');
exports.METADATA_PATH = path_1.default.join(exports.UPLOAD_DIR, '.library.json');
/** Reject path traversal and hidden names; allow multer-style opaque IDs. */
function safeUploadFilename(filename) {
    if (!filename || filename.includes('/') || filename.includes('\\')) {
        return null;
    }
    const base = path_1.default.basename(filename);
    if (base !== filename || base.includes('..') || base.startsWith('.')) {
        return null;
    }
    return base;
}
function listUploadedFiles() {
    if (!fs_1.default.existsSync(exports.UPLOAD_DIR)) {
        return [];
    }
    return fs_1.default
        .readdirSync(exports.UPLOAD_DIR)
        .filter((name) => name !== '.library.json' && !name.startsWith('.'))
        .sort();
}
function uploadFilePath(filename) {
    return resolveUploadReadPath(filename);
}
/** Opens a read stream only for files confined to the uploads directory. */
function openUploadReadStream(filename) {
    const resolved = resolveUploadReadPath(filename);
    if (!resolved) {
        return null;
    }
    return fs_1.default.createReadStream(resolved);
}
function resolveUploadReadPath(filename) {
    const safe = safeUploadFilename(filename);
    if (!safe) {
        return null;
    }
    const filePath = path_1.default.resolve(exports.UPLOAD_DIR, safe);
    const uploadRoot = path_1.default.resolve(exports.UPLOAD_DIR);
    const relative = path_1.default.relative(uploadRoot, filePath);
    if (relative.startsWith('..') || path_1.default.isAbsolute(relative)) {
        return null;
    }
    return filePath;
}
function readLibraryMetadata() {
    if (!fs_1.default.existsSync(exports.METADATA_PATH)) {
        return {};
    }
    try {
        return JSON.parse(fs_1.default.readFileSync(exports.METADATA_PATH, 'utf8'));
    }
    catch (_a) {
        return {};
    }
}
function writeShelfLabel(filename, label) {
    const safe = safeUploadFilename(filename);
    if (!safe) {
        throw new Error('Invalid filename');
    }
    const filePath = path_1.default.join(exports.UPLOAD_DIR, safe);
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error('File not found');
    }
    const metadata = readLibraryMetadata();
    const entry = Object.assign(Object.assign({}, label), { updatedAt: new Date().toISOString() });
    metadata[safe] = entry;
    fs_1.default.writeFileSync(exports.METADATA_PATH, JSON.stringify(metadata, null, 2));
    return entry;
}
