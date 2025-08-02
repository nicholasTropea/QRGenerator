import { useState } from 'react';
import Button from '../components/Button.jsx';
import InputField from '../components/InputField.jsx';
import styles from '../styles/Home.module.scss';

export default function Home() {
  const [value, setValue] = useState('');
  
  return (
    <div className={styles.main}>
      <h1 className={styles.title}>Welcome to the QR Code Generator!</h1>

      <p className={styles.infoText}>
        This tool can generate a QR code for anything you want: text, numbers, website URLs, even kanji characters!
        To see an in-depth list of what you can and cannot generate as a QR code, check the <a>what can I encode?</a> page! 
      </p>
      
      <InputField 
        classes={styles.inputField} 
        placeHolder={"Place your input here!"} 
        value={value}
        setValue={setValue}
      />

      <Button func={() => console.log({value})}>
        Generate QR code!
      </Button>
    </div>
  );
}