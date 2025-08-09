import { useEffect, useState } from 'react';
import styles from '../styles/HomeTitle.module.scss';

export default function HomeTitle() {
    const [titleVal, setTitle] = useState('');
    
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
    
    return (
        <h1 className={styles.title}>
            Generate a QR code for
            <span className={styles.phrase}> {titleVal} </span>
            <span className={styles.bar}> | </span>
        </h1>
    );
}