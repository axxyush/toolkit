import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { convertVideoWithFFmpeg } from './ffmpegClient';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const FORMAT_OPTIONS = [
  { id: 'txt', label: 'TXT', accept: '.txt,text/plain' },
  { id: 'md', label: 'Markdown', accept: '.md,.markdown,text/markdown' },
  { id: 'html', label: 'HTML', accept: '.html,.htm,text/html' },
  { id: 'pdf', label: 'PDF', accept: '.pdf,application/pdf' },
  { id: 'docx', label: 'DOCX', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'png', label: 'PNG', accept: '.png,image/png' },
  { id: 'jpg', label: 'JPG', accept: '.jpg,.jpeg,image/jpeg' },
  { id: 'webp', label: 'WebP', accept: '.webp,image/webp' },
  { id: 'gif', label: 'GIF', accept: '.gif,image/gif' },
  { id: 'svg', label: 'SVG', accept: '.svg,image/svg+xml' },
  { id: 'mp4', label: 'MP4', accept: '.mp4,video/mp4' },
  { id: 'mov', label: 'MOV', accept: '.mov,video/quicktime' },
  { id: 'webm', label: 'WebM', accept: '.webm,video/webm' },
  { id: 'mp3', label: 'MP3', accept: '.mp3,audio/mpeg' },
  { id: 'wav', label: 'WAV', accept: '.wav,audio/wav' },
];

/** Supported destination formats for each source */
export const CONVERSION_MAP = {
  txt: ['pdf', 'docx', 'md', 'html'],
  md: ['pdf', 'docx', 'txt', 'html'],
  html: ['pdf', 'txt', 'md'],
  pdf: ['txt', 'docx', 'png', 'jpg', 'webp'],
  docx: ['txt', 'md', 'html', 'pdf'],
  png: ['jpg', 'webp', 'gif', 'pdf', 'svg'],
  jpg: ['png', 'webp', 'pdf', 'svg'],
  webp: ['png', 'jpg', 'pdf', 'svg'],
  gif: ['png', 'jpg', 'webp', 'mp4'],
  svg: ['png', 'jpg', 'webp', 'pdf'],
  mp4: ['mov', 'webm', 'mp3', 'gif', 'png', 'jpg'],
  mov: ['mp4', 'webm', 'mp3', 'gif', 'png'],
  webm: ['mp4', 'mov', 'mp3', 'gif'],
  mp3: ['wav'],
  wav: ['mp3'],
};

export function acceptForFormat(formatId) {
  return FORMAT_OPTIONS.find((f) => f.id === formatId)?.accept || '*/*';
}

export function labelForFormat(formatId) {
  return FORMAT_OPTIONS.find((f) => f.id === formatId)?.label || formatId.toUpperCase();
}

function stripMarkdown(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .trim();
}

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

function textToParagraphs(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 160 },
        })
    );
}

function makePdfFromText(text, filename) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const lines = doc.splitTextToSize(text || ' ', width);
  let y = margin;
  const lineHeight = 16;
  lines.forEach((line) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });
  doc.save(filename);
}

async function makeDocxFromText(text, filename) {
  const doc = new Document({
    sections: [{ children: textToParagraphs(text || ' ') }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  saveAs(new Blob([text], { type: mime }), filename);
}

async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const chunks = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    chunks.push(content.items.map((item) => item.str).join(' '));
  }
  return chunks.join('\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

async function renderPdfPageToCanvas(file, pageNumber = 1, scale = 2) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return { canvas, pageCount: pdf.numPages };
}

function canvasToBlob(canvas, mime, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not export image.'))),
      mime,
      quality
    );
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

async function convertRasterImage(file, mime, filename) {
  const img = await loadImageFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  const blob = await canvasToBlob(canvas, mime);
  saveAs(blob, filename);
}

async function imageToPdf(file, filename) {
  const img = await loadImageFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  canvas.getContext('2d').drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 24;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / canvas.width, maxH / canvas.height);
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  doc.addImage(dataUrl, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
  doc.save(filename);
}

async function rasterToSvg(file, filename) {
  const img = await loadImageFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  canvas.getContext('2d').drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}" />
</svg>`;
  downloadText(svg, filename, 'image/svg+xml;charset=utf-8');
}

async function svgToRaster(file, mime, filename) {
  const text = await file.text();
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not render SVG.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1024;
    canvas.height = img.naturalHeight || 1024;
    const ctx = canvas.getContext('2d');
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const out = await canvasToBlob(canvas, mime);
    saveAs(out, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function pdfToImage(file, mime, filename) {
  const { canvas } = await renderPdfPageToCanvas(file, 1, 2);
  if (mime === 'image/jpeg') {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(canvas, 0, 0);
    const blob = await canvasToBlob(tmp, mime);
    saveAs(blob, filename);
    return;
  }
  const blob = await canvasToBlob(canvas, mime);
  saveAs(blob, filename);
}

function ffmpegArgs(from, to) {
  if (from === 'mp4' && to === 'mov') return ['-c', 'copy', '-f', 'mov'];
  if (from === 'mov' && to === 'mp4') return ['-c', 'copy', '-f', 'mp4'];
  if (to === 'webm') return ['-c:v', 'libvpx', '-b:v', '1M', '-c:a', 'libvorbis'];
  if (to === 'mp4') return ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac'];
  if (to === 'mov') return ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac', '-f', 'mov'];
  if (to === 'mp3') return ['-vn', '-acodec', 'libmp3lame', '-q:a', '2'];
  if (to === 'wav') return ['-vn', '-acodec', 'pcm_s16le'];
  if (to === 'gif') {
    return ['-vf', 'fps=10,scale=480:-1:flags=lanczos', '-c:v', 'gif', '-t', '12'];
  }
  if (to === 'png' || to === 'jpg') {
    return ['-ss', '00:00:01', '-frames:v', '1'];
  }
  return null;
}

export async function convertFile({
  file,
  from,
  to,
  onStatus,
  onProgress,
}) {
  const base = file.name.replace(/\.[^.]+$/, '') || 'converted';
  const outName = `${base}.${to === 'jpg' ? 'jpg' : to}`;

  // Text-like sources
  if (from === 'txt') {
    const text = await file.text();
    if (to === 'pdf') return makePdfFromText(text, outName);
    if (to === 'docx') return makeDocxFromText(text, outName);
    if (to === 'md') return downloadText(text, outName, 'text/markdown;charset=utf-8');
    if (to === 'html') {
      return downloadText(
        `<!DOCTYPE html><html><body><pre>${escapeHtml(text)}</pre></body></html>`,
        outName,
        'text/html;charset=utf-8'
      );
    }
  }

  if (from === 'md') {
    const md = await file.text();
    if (to === 'pdf') return makePdfFromText(stripMarkdown(md), outName);
    if (to === 'docx') return makeDocxFromText(stripMarkdown(md), outName);
    if (to === 'txt') return downloadText(stripMarkdown(md), outName);
    if (to === 'html') {
      const html = `<!DOCTYPE html><html><body>${marked.parse(md)}</body></html>`;
      return downloadText(html, outName, 'text/html;charset=utf-8');
    }
  }

  if (from === 'html') {
    const html = await file.text();
    const text = htmlToText(html);
    if (to === 'txt') return downloadText(text, outName);
    if (to === 'md') return downloadText(text, outName, 'text/markdown;charset=utf-8');
    if (to === 'pdf') return makePdfFromText(text, outName);
  }

  if (from === 'pdf') {
    if (to === 'txt') {
      const text = await extractPdfText(file);
      return downloadText(text || '', outName);
    }
    if (to === 'docx') {
      const text = await extractPdfText(file);
      return makeDocxFromText(text || ' ', outName);
    }
    if (to === 'png') return pdfToImage(file, 'image/png', outName);
    if (to === 'jpg') return pdfToImage(file, 'image/jpeg', outName);
    if (to === 'webp') return pdfToImage(file, 'image/webp', outName);
  }

  if (from === 'docx') {
    const buffer = await file.arrayBuffer();
    if (to === 'html') {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const html = `<!DOCTYPE html><html><body>${result.value}</body></html>`;
      return downloadText(html, outName, 'text/html;charset=utf-8');
    }
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value || '';
    if (to === 'txt') return downloadText(text, outName);
    if (to === 'md') return downloadText(text, outName, 'text/markdown;charset=utf-8');
    if (to === 'pdf') return makePdfFromText(text, outName);
  }

  // Images
  if (['png', 'jpg', 'webp', 'gif'].includes(from)) {
    if (to === 'png') return convertRasterImage(file, 'image/png', outName);
    if (to === 'jpg') return convertRasterImage(file, 'image/jpeg', outName);
    if (to === 'webp') return convertRasterImage(file, 'image/webp', outName);
    if (to === 'gif') return convertRasterImage(file, 'image/gif', outName);
    if (to === 'pdf') return imageToPdf(file, outName);
    if (to === 'svg') return rasterToSvg(file, outName);
  }

  if (from === 'svg') {
    if (to === 'png') return svgToRaster(file, 'image/png', outName);
    if (to === 'jpg') return svgToRaster(file, 'image/jpeg', outName);
    if (to === 'webp') return svgToRaster(file, 'image/webp', outName);
    if (to === 'pdf') {
      const img = await loadImageElementFromSvg(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1024;
      canvas.height = img.naturalHeight || 1024;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 24;
      const scale = Math.min(
        (pageW - margin * 2) / canvas.width,
        (pageH - margin * 2) / canvas.height
      );
      const w = canvas.width * scale;
      const h = canvas.height * scale;
      doc.addImage(dataUrl, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
      doc.save(outName);
      return;
    }
  }

  // Media via ffmpeg
  const args = ffmpegArgs(from, to);
  if (args) {
    const blob = await convertVideoWithFFmpeg({
      file,
      outputName: outName,
      args,
      onStatus,
      onProgress,
    });
    saveAs(blob, outName);
    return;
  }

  throw new Error(`Conversion from ${from.toUpperCase()} to ${to.toUpperCase()} is not supported.`);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadImageElementFromSvg(file) {
  const text = await file.text();
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not render SVG.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
