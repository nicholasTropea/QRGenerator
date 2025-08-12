import { useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';

import Overlay from '../components/Overlay.jsx';
import Footer from '../components/Footer.jsx';
import HomeTitle from '../components/HomeTitle.jsx';
import HomeInfoText from '../components/HomeInfoText.jsx';
import InputField from '../components/InputField.jsx';
import Button from '../components/Button.jsx';
import Canvas from '../components/Canvas.jsx';

import styles from '../styles/Home.module.scss';

import main from '../utils/main.js';

export default function Home() {
  const isWide = useMediaQuery({ minWidth : 768 }); // Tablet & up
  const [value, setValue] = useState('');
  const [matrix, setMatrix] = useState(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);


  useEffect(() => {
    const initialHeight = window.innerHeight;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    if (!isMobile) return;

    function checkKeyboard() {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;
      const keyboardOpen = heightDiff > 150;
      
      if (keyboardOpen !== isKeyboardOpen) {
        setIsKeyboardOpen(keyboardOpen);
        
        if (keyboardOpen) console.log('Keyboard is UP');
        else console.log('Keyboard is DOWN');
      }
    }

    const handleFocusInOut = (e) => {
      if (e.target.matches('input, textarea')) setTimeout(checkKeyboard, 300);
    };

    window.addEventListener('resize', checkKeyboard);
    document.addEventListener('focusin', handleFocusInOut);
    document.addEventListener('focusout', handleFocusInOut);

    // CLeanup
    return () => {
      window.removeEventListener('resize', checkKeyboard);
      document.removeEventListener('focusin', handleFocusInOut);
      document.removeEventListener('focusout', handleFocusInOut);
    };
  }, [isKeyboardOpen]);

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
      { !isKeyboardOpen && <Footer /> }
      <HomeTitle />

      {/* Conditional components, they render based on the presence/absence of the QR */}

      {
        matrix === null ?
        (
          <>
            { isWide && <HomeInfoText /> } 

            <InputField 
              classes={styles.inputField} 
              placeHolder={"Place your input here!"} 
              value={value}
              setValue={setValue}
            />
            
            <Button 
              value={value} 
              func={handleMatrixGeneration} 
              classes={`${styles.glowButton} ${(value ? styles.glowing : '')}`}
            >
              Generate QR code!
            </Button> 
          </>
        ) :
        (
          <>
            <Canvas matrix={matrix} />

            <Button 
              value={null} 
              func={handleResetButton}
              classes={styles.newQRButton}
            >
              Create a new QR code!  
            </Button>
          </>
        )
      }
    </div>
  );
}