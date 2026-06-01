import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'document-saver-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/save-document' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { fileName, fileData } = JSON.parse(body);
                
                // Sanitize fileName to prevent path traversal
                const safeFileName = path.basename(fileName);
                
                // Decode base64 data URL
                const matches = fileData.match(/^data:(.+);base64,(.+)$/);
                if (!matches) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid file format' }));
                  return;
                }
                
                const buffer = Buffer.from(matches[2], 'base64');
                
                // Save directory inside public
                const dir = path.resolve(__dirname, 'public/generated_docs');
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }
                
                const filePath = path.join(dir, safeFileName);
                fs.writeFileSync(filePath, buffer);
                
                // Return the static link relative to public
                const fileUrl = `/generated_docs/${safeFileName}`;
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ fileUrl }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else if (req.url.startsWith('/generated_docs/') && req.url.includes('.docx') && req.method === 'GET') {
            const urlPath = decodeURIComponent(req.url.split('?')[0]);
            const safeFileName = path.basename(urlPath);
            const filePath = path.join(__dirname, 'public/generated_docs', safeFileName);
            if (fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
              res.setHeader('Content-Length', stat.size);
              res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFileName)}"`);
              
              const stream = fs.createReadStream(filePath);
              stream.pipe(res);
            } else {
              res.statusCode = 404;
              res.end('File not found');
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 3457,
    strictPort: true
  }
})
