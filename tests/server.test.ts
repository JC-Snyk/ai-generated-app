import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../index';

describe('PDF Upload/Download', () => {
  const uploadDir = path.join(__dirname, '../uploads');

  beforeAll(() => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
  });

  afterAll(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  describe('Upload PDF', () => {
    it('should upload a valid PDF file', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('pdf', path.join(__dirname, 'test.pdf'));
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('File uploaded');
    });

    it('should not upload an invalid file type', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('pdf', path.join(__dirname, 'test.jpg'));
      expect(res.statusCode).toBe(400);
      expect(res.text).toBe('No file uploaded.');
    });
  });

  describe('List files', () => {
    it('should list uploaded files with labels', async () => {
      fs.writeFileSync(path.join(uploadDir, 'listed.pdf'), 'x');
      const res = await request(app).get('/api/files');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([{ name: 'listed.pdf', label: null }])
      );
    });
  });

  describe('AI shelf label', () => {
    it('should reject invalid filenames', async () => {
      const res = await request(app)
        .post('/api/ai/shelf-label')
        .send({ filename: '../secrets' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 503 when Groq is not configured', async () => {
      const prior = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;
      fs.writeFileSync(path.join(uploadDir, 'ai-test.pdf'), 'pdf');
      const res = await request(app)
        .post('/api/ai/shelf-label')
        .send({ filename: 'ai-test.pdf', hint: 'demo' });
      if (prior) {
        process.env.GROQ_API_KEY = prior;
      }
      expect(res.statusCode).toBe(503);
    });
  });

  describe('Download PDF', () => {
    it('should download an existing PDF file', async () => {
      const filename = 'test.pdf';
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, 'test content');

      const res = await request(app).get(`/download/${filename}`);
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('test content');
    });

    it('should return 404 for a non-existing PDF file', async () => {
      const res = await request(app).get('/download/nonexistent.pdf');
      expect(res.statusCode).toBe(404);
      expect(res.text).toBe('File not found');
    });

    it('should block path traversal outside uploads', async () => {
      const res = await request(app).get('/download/..%2F..%2Fpackage.json');
      expect(res.statusCode).toBe(400);
      expect(res.text).toContain('uploads directory');
    });
  });
});
