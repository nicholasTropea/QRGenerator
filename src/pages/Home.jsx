import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import InputField from '../components/InputField.jsx';
import Canvas from '../components/Canvas.jsx';
import styles from '../styles/Home.module.scss';
import main from '../utils/main.js';

export default function Home() {
  const [titleVal, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [matrix, setMatrix] = useState(null);

  const phrases = [
    "your website",
    "an image",
    "your text",
    "a pdf",
    "your WIFI password"
  ];

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let typing = true;

    const type = () => {
      const currentPhrase = phrases[phraseIndex];

      if (typing) {
        setTitle(currentPhrase.slice(0, charIndex++ + 1));

        // Finished writing phrase
        if (charIndex === currentPhrase.length + 1) {
          typing = false;
          setTimeout(type, 2000);
          return;
        }
      }
      else {
        setTitle(currentPhrase.slice(0, charIndex-- - 1));

        // Finished deleting phrase
        if (charIndex === 0) {
          typing = true;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }

      setTimeout(type, typing ? 100 : 80);
    };

    type();

    // Cleanup in case component unmounts
    return () => clearTimeout();
  }, []);

  const handleMatrixGeneration = (value) => {
    if (!value) return;
    
    const resultMatrix = main(value);
    setMatrix(resultMatrix);
  }

  const handleResetButton = () => {
    setMatrix(null);
    setValue('');
  }

  const switchInput = () => {
    
    
    let chars = Array.from(titleVal);
  }

  return (
    <div className={styles.main}>
      <h1 className={styles.title}>Generate a QR code for {titleVal} <span id={styles.textBar}>|</span> </h1>

      <p className={styles.infoText}>
        This tool can generate a QR code for anything you want: text, numbers, website URLs, even kanji characters!
        To see an in-depth list of what you can and cannot generate as a QR code, check the <a>what can I encode?</a> page! 
      </p>
      
      {/* Conditional components, they render based on the presence/absence of the QR */}
      { matrix === null && <InputField 
        classes={styles.inputField} 
        placeHolder={"Place your input here!"} 
        value={value}
        setValue={setValue}
      /> }

      { matrix === null && <Button value={value} func={handleMatrixGeneration}>
        Generate QR code!
      </Button> }

      { matrix !== null && <Canvas matrix={matrix} /> }

      { matrix !== null && <Button value={null} func={handleResetButton}>
        Create a new QR code!  
      </Button>}
    </div>
  );
}