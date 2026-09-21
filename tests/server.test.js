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
    });
});
