import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import QRGenerator from './pages/tools/QRGenerator';
import YouTubeToText from './pages/tools/YouTubeToText';
import FileConverter from './pages/tools/FileConverter';
import FileCompressor from './pages/tools/FileCompressor';
import PdfMerge from './pages/tools/PdfMerge';
import BackgroundRemover from './pages/tools/BackgroundRemover';
import DiffChecker from './pages/tools/DiffChecker';
import SpeechToText from './pages/tools/SpeechToText';
import PasswordGenerator from './pages/tools/PasswordGenerator';
import JsonFormatter from './pages/tools/JsonFormatter';
import MarkdownPreview from './pages/tools/MarkdownPreview';
import WordCounter from './pages/tools/WordCounter';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tools/qr-generator" element={<QRGenerator />} />
          <Route path="tools/youtube-to-text" element={<YouTubeToText />} />
          <Route path="tools/file-converter" element={<FileConverter />} />
          <Route path="tools/file-compressor" element={<FileCompressor />} />
          <Route path="tools/image-compressor" element={<Navigate to="/tools/file-compressor" replace />} />
          <Route path="tools/pdf-merge" element={<PdfMerge />} />
          <Route path="tools/background-remover" element={<BackgroundRemover />} />
          <Route path="tools/diff-checker" element={<DiffChecker />} />
          <Route path="tools/speech-to-text" element={<SpeechToText />} />
          <Route path="tools/password-generator" element={<PasswordGenerator />} />
          <Route path="tools/json-formatter" element={<JsonFormatter />} />
          <Route path="tools/markdown-preview" element={<MarkdownPreview />} />
          <Route path="tools/word-counter" element={<WordCounter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
