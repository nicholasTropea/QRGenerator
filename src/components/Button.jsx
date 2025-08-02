import styles from '../styles/Button.module.scss';

export default function Button({ classes = '', func, children }) {
    return (
        <button 
            className={`${styles.buttonField} ${classes}`} 
            onClick={func}
        >
            {children}
        </button>
    );
}