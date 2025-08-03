import styles from '../styles/Button.module.scss';

export default function Button({ classes = '', func, value, children }) {
    return (
        <button 
            className={`${styles.buttonField} ${classes}`} 
            onClick={() => func(value)}
        >
            {children}
        </button>
    );
}