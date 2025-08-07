import styles from '../styles/Button.module.scss';

export default function Button({ classes = '', func, value, children, glowing = false }) {
    return (
        <button 
            className={`${styles.buttonField} ${glowing ? styles.glowing : ''} ${classes}`} 
            onClick={() => value ? func(value) : func()}
        >
            {children}
        </button>
    );
}