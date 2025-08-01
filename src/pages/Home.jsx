import Button from '../components/Button.jsx';
import InputField from '../components/InputField.jsx';

export default function Home() {
  return (
    <>
      <h1>Welcome to the QR Code Generator!</h1>
      <p>
        This tool can generate a QR code for anything you want: text, numbers, website URLs, even kanji characters!
        To see an in-depth list of what you can and cannot generate as a QR code, check the <a>what can I encode?</a> page! 
      </p>
      <InputField placeHolder={"Place your input here!"} />
      <Button func={() => console.log("Pressed")}>
        Generate QR code!
      </Button>
    </>
  );
}