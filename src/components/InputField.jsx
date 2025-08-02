import styles from '../styles/InputField.module.scss';

export default function InputField({ classes = '', placeHolder, value, setValue }) {
    function handleChange(event) {
        setValue(event.target.value);
    }
    
    return (
        <input 
            className={`${styles.inputField} ${classes}`}
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeHolder}>
        </input>
    );
}