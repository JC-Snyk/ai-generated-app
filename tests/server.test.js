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
const supertest_1 = __importDefault(require("supertest"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("../index");
describe('PDF Upload/Download', () => {
    const uploadDir = path_1.default.join(__dirname, '../uploads');
    beforeAll(() => {
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir);
        }
    });
    afterAll(() => {
        fs_1.default.rmSync(uploadDir, { recursive: true, force: true });
    });
    describe('Upload PDF', () => {
        it('should upload a valid PDF file', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .post('/upload')
                .attach('pdf', path_1.default.join(__dirname, 'test.pdf'));
            expect(res.statusCode).toBe(200);
            expect(res.text).toContain('File uploaded');
        }));
        it('should not upload an invalid file type', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .post('/upload')
                .attach('pdf', path_1.default.join(__dirname, 'test.jpg'));
            expect(res.statusCode).toBe(400);
            expect(res.text).toBe('No file uploaded.');
        }));
    });
    describe('List files', () => {
        it('should list uploaded files with labels', () => __awaiter(void 0, void 0, void 0, function* () {
            fs_1.default.writeFileSync(path_1.default.join(uploadDir, 'listed.pdf'), 'x');
            const res = yield (0, supertest_1.default)(index_1.app).get('/api/files');
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(expect.arrayContaining([{ name: 'listed.pdf', label: null }]));
        }));
    });
    describe('AI shelf label', () => {
        it('should reject invalid filenames', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .post('/api/ai/shelf-label')
                .send({ filename: '../secrets' });
            expect(res.statusCode).toBe(400);
        }));
        it('should return 503 when Groq is not configured', () => __awaiter(void 0, void 0, void 0, function* () {
            const prior = process.env.GROQ_API_KEY;
            delete process.env.GROQ_API_KEY;
            fs_1.default.writeFileSync(path_1.default.join(uploadDir, 'ai-test.pdf'), 'pdf');
            const res = yield (0, supertest_1.default)(index_1.app)
                .post('/api/ai/shelf-label')
                .send({ filename: 'ai-test.pdf', hint: 'demo' });
            if (prior) {
                process.env.GROQ_API_KEY = prior;
            }
            expect(res.statusCode).toBe(503);
        }));
    });
    describe('Download PDF', () => {
        it('should download an existing PDF file', () => __awaiter(void 0, void 0, void 0, function* () {
            const filename = 'test.pdf';
            const filePath = path_1.default.join(uploadDir, filename);
            fs_1.default.writeFileSync(filePath, 'test content');
            const res = yield (0, supertest_1.default)(index_1.app).get(`/download/${filename}`);
            expect(res.statusCode).toBe(200);
            expect(res.text).toBe('test content');
        }));
        it('should return 404 for a non-existing PDF file', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app).get('/download/nonexistent.pdf');
            expect(res.statusCode).toBe(404);
            expect(res.text).toBe('File not found');
        }));
        it('should block path traversal outside uploads', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app).get('/download/..%2F..%2Fpackage.json');
            expect(res.statusCode).toBe(400);
            expect(res.text).toContain('uploads directory');
        }));
    });
});
