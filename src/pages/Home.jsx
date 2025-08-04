import { useState } from 'react';
import Button from '../components/Button.jsx';
import InputField from '../components/InputField.jsx';
import Canvas from '../components/Canvas.jsx';
import styles from '../styles/Home.module.scss';
import main from '../utils/main.js';

export default function Home() {
  const [value, setValue] = useState('');

  const [matrix, setMatrix] = useState(null);

  const handleMatrixGeneration = (value) => {
    if (value === null || value === '' || value === undefined) return;
    
    const resultMatrix = main(value);
    setMatrix(resultMatrix);
  }

  const handleResetButton = () => {
    setMatrix(null);
    setValue('');
  }

  return (
    <div className={styles.main}>
      <h1 className={styles.title}>Welcome to the QR Code Generator!</h1>

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