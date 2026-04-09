import { useRef, useState } from 'react';

export default function FileUploader({ onFile, loading }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    const file = [...files].find((f) =>
      f.type.match(/audio\/(mpeg|flac|wav|x-wav|ogg|mp4|aac)/) ||
      f.name.match(/\.(mp3|flac|wav|ogg|aac|m4a)$/i)
    );
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !loading && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? '#ff8800' : '#333'}`,
        borderRadius: 8,
        padding: '16px 24px',
        textAlign: 'center',
        cursor: loading ? 'wait' : 'pointer',
        background: dragOver ? '#ff880011' : '#0e0e12',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.flac,.wav,.ogg,.aac,.m4a,audio/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {loading ? (
        <>
          <div
            style={{
              width: 28,
              height: 28,
              border: '3px solid #ff4400',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: 11, color: '#ff8800', fontFamily: 'Courier New' }}>
            ANALYZING...
          </span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 24 }}>📁</span>
          <span style={{ fontSize: 12, color: '#ff8800', fontFamily: 'Courier New', fontWeight: 'bold' }}>
            DROP AUDIO FILE
          </span>
          <span style={{ fontSize: 10, color: '#555', fontFamily: 'Courier New' }}>
            MP3 • FLAC • WAV • OGG • AAC
          </span>
        </>
      )}
    </div>
  );
}
