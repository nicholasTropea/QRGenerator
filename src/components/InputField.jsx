import styles from '../styles/InputField.module.scss';

export default function InputField({ classes = '', placeHolder }) {
    return (
        <input 
            className={`${styles.inputField} ${classes}`}
            type="text"
            placeholder={placeHolder}>
        </input>
    );
}