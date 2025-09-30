import styles from '../styles/About.module.scss';

export default function About() {
  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>About QR Generator</h1>
        
        <div className={styles.content}>
          <section className={styles.section}>
            <h2>Features</h2>
            <ul>
              <li>Generate QR codes from any text input</li>
              <li>Support for URLs, plain text, and contact information</li>
              <li>Multiple character encoding support including Kanji</li>
              <li>Error correction capability</li>
              <li>Instant generation with no server requirements</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>How It Works</h2>
            <p>
              This QR code generator uses a custom implementation that follows the QR code specification.
              It includes features like automatic mode selection, optimal data encoding, and Reed-Solomon error correction.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Usage</h2>
            <p>
              Simply enter your text in the input field on the home page and click "Generate QR Code".
              The generated QR code can be scanned by any QR code reader or smartphone camera.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}