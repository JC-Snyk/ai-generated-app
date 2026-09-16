import fs from 'fs';
import path from 'path';
import express, { type RequestHandler } from 'express';
import multer from 'multer';
import { generateShelfLabel } from './lib/groq';
import {
  listUploadedFiles,
  readLibraryMetadata,
  safeUploadFilename,
  UPLOAD_DIR,
  uploadFilePath,
  writeShelfLabel,
} from './lib/uploads';

/** Load `.env` into process.env (Node does not do this automatically). */
function loadEnvFile(): void {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

export const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.get('/api/files', (_req, res) => {
  const files = listUploadedFiles();
  const labels = readLibraryMetadata();
  res.json(
    files.map((name) => ({
      name,
      label: labels[name] ?? null,
    }))
  );
});

app.post('/upload', upload.single('pdf') as unknown as RequestHandler, (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send(`File uploaded: ${req.file.filename}`);
});

app.post('/api/ai/shelf-label', async (req, res) => {
  const filename = typeof req.body?.filename === 'string' ? req.body.filename : '';
  const hint = typeof req.body?.hint === 'string' ? req.body.hint.trim().slice(0, 500) : '';
  const originalName =
    typeof req.body?.originalName === 'string' ? req.body.originalName.trim().slice(0, 255) : filename;

  const filePath = uploadFilePath(filename);
  if (!filePath) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const shelf = await generateShelfLabel(originalName || filename, filename, hint);
    const stored = writeShelfLabel(filename, shelf);
    res.json(stored);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Shelf label failed';
    if (message.includes('GROQ_API_KEY')) {
      return res.status(503).json({
        error: 'AI librarian is offline. Set GROQ_API_KEY (see .env.example).',
      });
    }
    res.status(502).json({ error: message });
  }
});

app.get('/download/:filename', (req, res) => {
  const safeName = safeUploadFilename(req.params.filename);
  if (!safeName) {
    return res.status(400).send('Access to files outside the uploads directory is not allowed.');
  }
  const uploadsRoot = path.resolve(UPLOAD_DIR);
  res.sendFile(safeName, { root: uploadsRoot }, (err) => {
    if (!err) {
      return;
    }
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      res.status(404).send('File not found');
      return;
    }
    res.status(400).send('Access to files outside the uploads directory is not allowed.');
  });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
}
