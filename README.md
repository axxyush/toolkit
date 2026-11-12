# Toolkit

A small browser workshop of everyday utilities — convert files, compress media, generate codes, pull YouTube captions, and clear through busywork without uploading your stuff to a random website.

Most tools run locally in your browser. YouTube captions need `npm start` so the local proxy can talk to YouTube.

## Tools

| Tool | What it does |
| --- | --- |
| **QR Generator** | Turn any URL or text into a downloadable QR code |
| **YouTube → Text** | Pull captions/subtitles from a YouTube video |
| **File Converter** | Convert between documents, images, and video/audio formats |
| **File Compressor** | Compress images, PDFs, docs, videos, or zip any files |
| **PDF Merge** | Combine multiple PDFs into one file |
| **Background Remover** | Remove the background from a photo (on-device AI) |
| **Diff Checker** | Compare two texts and highlight changes |
| **Speech → Text** | Dictate with your mic (Chrome/Edge/Safari) |
| **Password Generator** | Create strong, copy-ready passwords |
| **JSON Formatter** | Pretty-print, minify, and validate JSON |
| **Markdown Preview** | Live Markdown preview |
| **Word Counter** | Words, characters, sentences, and reading time |

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build → build/
npm test        # test runner
```

## Stack

React (Create React App) with client-side libraries for QR codes, PDF/DOCX, ffmpeg.wasm video conversion, zip compression, and background removal.
