import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg;
let loading;
let progressHandler;

const CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

export async function getFFmpeg(onProgress) {
  if (!loading) {
    loading = (async () => {
      const instance = new FFmpeg();
      await instance.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpeg = instance;
      return instance;
    })();
  }

  const instance = ffmpeg?.loaded ? ffmpeg : await loading;

  if (progressHandler) {
    instance.off('progress', progressHandler);
  }
  progressHandler = ({ progress }) => {
    onProgress?.(Math.round((progress || 0) * 100));
  };
  instance.on('progress', progressHandler);

  return instance;
}

export async function convertVideoWithFFmpeg({
  file,
  outputName,
  args,
  onStatus,
  onProgress,
}) {
  onStatus?.('Loading ffmpeg (first run may take a moment)…');
  const ff = await getFFmpeg(onProgress);

  const inputName = `input${getExtension(file.name)}`;
  onStatus?.('Writing file into ffmpeg…');
  await ff.writeFile(inputName, await fetchFile(file));

  onStatus?.('Converting…');
  const code = await ff.exec(['-i', inputName, ...args, outputName]);
  if (code !== 0) {
    throw new Error('ffmpeg conversion failed.');
  }

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});

  return new Blob([data.buffer], { type: mimeForName(outputName) });
}

function getExtension(name) {
  const match = /\.[^.]+$/.exec(name || '');
  return match ? match[0].toLowerCase() : '.bin';
}

function mimeForName(name) {
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.wav')) return 'audio/wav';
  return 'application/octet-stream';
}
