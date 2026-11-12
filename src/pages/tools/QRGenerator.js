import { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'qr-generator');

export default function QRGenerator() {
  const [text, setText] = useState('https://');
  const [size, setSize] = useState(240);
  const value = useMemo(() => text.trim() || ' ', [text]);

  const download = () => {
    const canvas = document.getElementById('toolkit-qr');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'toolkit-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="field">
          <label htmlFor="qr-text">Text or URL</label>
          <textarea
            id="qr-text"
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a link or type any text"
          />
        </div>

        <div className="field" style={{ maxWidth: 280 }}>
          <label htmlFor="qr-size">Size: {size}px</label>
          <input
            id="qr-size"
            className="input"
            type="range"
            min="160"
            max="400"
            step="8"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>

        <div className="qr-wrap">
          <QRCodeCanvas
            id="toolkit-qr"
            value={value}
            size={size}
            includeMargin
            bgColor="#ffffff"
            fgColor="#0b1220"
          />
        </div>

        <div className="row">
          <button type="button" className="btn btn-primary" onClick={download}>
            Download PNG
          </button>
        </div>
      </div>
    </ToolShell>
  );
}
