import { useState } from 'react';
import styles from '../styles/Home.module.scss';
import main from '../utils/main.js';

export default function Home() {
  const [input, setInput] = useState('');
  const [qrMatrix, setQRMatrix] = useState(null);

  const handleGenerate = () => {
    if (!input) return;
    const matrix = main(input);
    setQRMatrix(matrix);
  };

  const handleReset = () => {
    setQRMatrix(null);
    setInput('');
  };

  const handleDownload = () => {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const size = qrMatrix.length;
    const scale = 10; // Each QR cell will be 10x10 pixels
    const padding = 40; // 20px padding on each side
    
    canvas.width = size * scale + padding * 2;
    canvas.height = size * scale + padding * 2;
    
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw QR code
    ctx.fillStyle = 'black';
    qrMatrix.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (cell === 1) {
          ctx.fillRect(
            j * scale + padding,
            i * scale + padding,
            scale,
            scale
          );
        }
      });
    });
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          Generate QR Codes<span className={styles.highlight}>instantly</span>
        </h1>

        {!qrMatrix ? (
          <div className={styles.inputSection}>
            <p className={styles.description}>
              Create QR codes for text, URLs, contact information, or any other data.
            </p>

            <div className={styles.inputContainer}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your text here"
                className={styles.input}
              />
              <button
                onClick={handleGenerate}
                disabled={!input}
                className={styles.generateButton}
              >
                Generate QR Code
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.qrSection}>
            <div className={styles.qrCode}>
              {qrMatrix.map((row, i) => (
                <div key={i} className={styles.qrRow}>
                  {row.map((cell, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={`${styles.qrCell} ${cell === 1 ? styles.black : styles.white}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            
            <div className={styles.actions}>
              <button
                onClick={handleDownload}
                className={`${styles.actionButton} ${styles.downloadButton}`}
              >
                Download PNG
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(input)}
                className={styles.actionButton}
              >
                Copy Text
              </button>
              <button
                onClick={handleReset}
                className={styles.actionButton}
              >
                Create New QR Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}