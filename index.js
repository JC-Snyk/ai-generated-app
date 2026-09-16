"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const groq_1 = require("./lib/groq");
const uploads_1 = require("./lib/uploads");
/** Load `.env` into process.env (Node does not do this automatically). */
function loadEnvFile() {
    const envPath = path_1.default.join(__dirname, '.env');
    if (!fs_1.default.existsSync(envPath)) {
        return;
    }
    const lines = fs_1.default.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const eq = trimmed.indexOf('=');
        if (eq === -1) {
            continue;
        }
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
loadEnvFile();
exports.app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
exports.app.use(express_1.default.static('public'));
exports.app.use(express_1.default.json());
exports.app.get('/api/files', (_req, res) => {
    const files = (0, uploads_1.listUploadedFiles)();
    const labels = (0, uploads_1.readLibraryMetadata)();
    res.json(files.map((name) => { var _a; return ({
        name,
        label: (_a = labels[name]) !== null && _a !== void 0 ? _a : null,
    }); }));
});
exports.app.post('/upload', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded: ${req.file.filename}`);
});
exports.app.post('/api/ai/shelf-label', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const filename = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.filename) === 'string' ? req.body.filename : '';
    const hint = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.hint) === 'string' ? req.body.hint.trim().slice(0, 500) : '';
    const originalName = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.originalName) === 'string' ? req.body.originalName.trim().slice(0, 255) : filename;
    const filePath = (0, uploads_1.uploadFilePath)(filename);
    if (!filePath) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    try {
        const shelf = yield (0, groq_1.generateShelfLabel)(originalName || filename, filename, hint);
        const stored = (0, uploads_1.writeShelfLabel)(filename, shelf);
        res.json(stored);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Shelf label failed';
        if (message.includes('GROQ_API_KEY')) {
            return res.status(503).json({
                error: 'AI librarian is offline. Set GROQ_API_KEY (see .env.example).',
            });
        }
        res.status(502).json({ error: message });
    }
}));
exports.app.get('/download/:filename', (req, res) => {
    const safeName = (0, uploads_1.safeUploadFilename)(req.params.filename);
    if (!safeName) {
        return res.status(400).send('Access to files outside the uploads directory is not allowed.');
    }
    const uploadsRoot = path_1.default.resolve(uploads_1.UPLOAD_DIR);
    res.sendFile(safeName, { root: uploadsRoot }, (err) => {
        if (!err) {
            return;
        }
        const code = err.code;
        if (code === 'ENOENT') {
            res.status(404).send('File not found');
            return;
        }
        res.status(400).send('Access to files outside the uploads directory is not allowed.');
    });
});
if (require.main === module) {
    exports.app.listen(3000, () => {
        console.log('Server listening on port 3000');
    });
}
