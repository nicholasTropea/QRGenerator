import styles from '../styles/Footer.module.scss';

export default function Footer() {
    return (
        <div className={styles.footer}>
            <span className={styles.text}>
                <a
                    className={styles.link}
                    href='https://github.com/nicholasTropea/QRGenerator/blob/main/LICENSE.md'
                    target='_blank'
                    rel="noopener noreferrer"
                >
                    Copyright{' '}
                </a>
                © 2025{' '}
                <span className={styles.name}>Nicholas Tropea</span>
            </span>
        </div>
    );
}