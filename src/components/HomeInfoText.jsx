import styles from '../styles/HomeInfoText.module.scss';

export default function HomeInfoText() {
    return (
        <p className={styles.text}>
            This tool can generate a QR code for anything you want: text, numbers, website URLs, even kanji characters!
            To see an in-depth list of what you can and cannot generate as a QR code, check the <a>what can I encode?</a> page!
        </p>
    );
}