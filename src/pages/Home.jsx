import { useState } from 'react';

import Overlay from '../components/Overlay.jsx';
import HomeTitle from '../components/HomeTitle.jsx';
import HomeInfoText from '../components/HomeInfoText.jsx';
import InputField from '../components/InputField.jsx';
import Button from '../components/Button.jsx';
import Canvas from '../components/Canvas.jsx';

import styles from '../styles/Home.module.scss';

import main from '../utils/main.js';

export default function Home() {
  const [value, setValue] = useState('');
  const [matrix, setMatrix] = useState(null);

  const handleMatrixGeneration = (value) => {
    if (!value) return;
    
    const resultMatrix = main(value);
    setMatrix(resultMatrix);
  }

  const handleResetButton = () => {
    setMatrix(null);
    setValue('');
  }

  return (
    <div className={styles.main}>
      <Overlay />
      <HomeTitle />

      {/* Conditional components, they render based on the presence/absence of the QR */}

      { matrix === null && <HomeInfoText /> }

      { 
        matrix === null && 
        <InputField 
          classes={styles.inputField} 
          placeHolder={"Place your input here!"} 
          value={value}
          setValue={setValue}
        /> 
      }

      { 
        matrix === null &&
        <Button 
          value={value} 
          func={handleMatrixGeneration} 
          classes={styles.glowButton + (value ? ' ' + styles.glowing : '')}
        >
          Generate QR code!
        </Button> 
      }

      { matrix !== null && <Canvas matrix={matrix} /> }

      { 
        matrix !== null && 
        <Button 
          value={null} 
          func={handleResetButton}
          classes={styles.newQRButton}
        >
          Create a new QR code!  
        </Button>
      }
    </div>
  );
}