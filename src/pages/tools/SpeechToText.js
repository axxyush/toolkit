import { useEffect, useRef, useState } from 'react';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'speech-to-text');

function getRecognition() {
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  if (!SpeechRecognition) return null;
  return new SpeechRecognition();
}

export default function SpeechToText() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('');
  const [lang, setLang] = useState('en-US');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const recognition = getRecognition();
    if (!recognition) {
      setSupported(false);
      setStatus('Speech recognition needs Chrome, Edge, or Safari.');
      return undefined;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';
        if (result.isFinal) finalChunk += `${text} `;
        else interimChunk += text;
      }
      if (finalChunk) {
        setTranscript((prev) => `${prev}${finalChunk}`.replace(/\s+/g, ' ').trim() + ' ');
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'not-allowed') {
        setStatus('Microphone permission blocked. Allow mic access and try again.');
      } else if (event.error === 'no-speech') {
        setStatus('No speech detected. Try again.');
      } else {
        setStatus(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    setSupported(true);
    setStatus('Ready — click Start and speak.');

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.lang = lang;
      recognition.start();
      setListening(true);
      setStatus('Listening…');
    } catch (err) {
      setStatus(err.message || 'Could not start recognition.');
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setStatus('Stopped.');
  };

  const copy = async () => {
    const text = `${transcript}${interim}`.trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setStatus('Copied.');
  };

  const download = () => {
    const text = `${transcript}${interim}`.trim();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'speech-transcript.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="field" style={{ maxWidth: 280 }}>
          <label htmlFor="speech-lang">Language</label>
          <select
            id="speech-lang"
            className="select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            disabled={listening}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="hi-IN">Hindi</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="pt-BR">Portuguese (BR)</option>
            <option value="ja-JP">Japanese</option>
          </select>
        </div>

        <div className="row">
          {!listening ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={start}
              disabled={!supported}
            >
              Start listening
            </button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={stop}>
              Stop
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={copy}
            disabled={!transcript && !interim}
          >
            Copy
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={download}
            disabled={!transcript && !interim}
          >
            Download .txt
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setTranscript('');
              setInterim('');
              setStatus('Cleared.');
            }}
            disabled={listening}
          >
            Clear
          </button>
        </div>

        {status && (
          <p
            className={`status ${
              status.includes('blocked') ||
              status.includes('error') ||
              status.includes('needs')
                ? 'error'
                : 'ok'
            }`}
          >
            {status}
          </p>
        )}

        <div className="field">
          <label htmlFor="speech-out">Transcript</label>
          <textarea
            id="speech-out"
            className="textarea"
            style={{ minHeight: 260 }}
            value={`${transcript}${interim}`}
            onChange={(e) => {
              setTranscript(e.target.value);
              setInterim('');
            }}
            placeholder="Your words will appear here…"
          />
        </div>
      </div>
    </ToolShell>
  );
}
