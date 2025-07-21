/* ######################## MACROS ######################## */

const INVALID_LENGTH = -1;
const INVALID_CHARACTER = -2;

/* ######################## IMPORTS ######################## */

// Raw data encoding
import {
  MODE_INDICATORS,
  ALPHANUMERIC_TABLE,
  LEVEL_VERSION_DATA
} from "./raw_data_encoding_constants.js";

// Reed-Solomon error correction
import {
  LOG_ANTILOG_TABLE,
  GEN_POLYNOMIALS
} from "./reed_solomon_constants.js";  

/* ######################## MAIN ######################## */

// Execute program
main();

function main() {
  let input = "hello world";
  let inputLen = input.length;
  input = input.toUpperCase();

  let err = validateInput(input, inputLen);
  if (err === INVALID_LENGTH) return;

  let level = getLevel(inputLen);
  let version = versionBinarySearch(level, inputLen, 20, 1, 40); // Find minimum level required
  console.log("Version: " + version + "\nCorrection level: " + level + "\n");

  let rawDataBits = modeEncoder(input, inputLen, version);
  if (rawDataBits === INVALID_CHARACTER) return;
  console.log("Encoded string: " + rawDataBits + "\n");

  rawDataBits = completeRawDataBits(rawDataBits, level, version);
  console.log("Final raw data bits: " + rawDataBits + "\n");

  let messagePolynomial = generateMessagePolynomial(rawDataBits);

  // console.log(messagePolynomial.length);
  // let output = "[ ";
  // for (let exp of messagePolynomial) output += exp + " ";
  // output += "]";
  // console.log(output) 

  
}

/* ######################## UTILITIES ######################## */

function validateInput(str, len) {
  if (len == 0) return INVALID_LENGTH;

  // Input too long
  if (len > LEVEL_VERSION_DATA.L[40].totalCapacity) { 
    console.log("The input is too long, I can't generate a QR code!");
    return INVALID_LENGTH;
  }

  return 0;
}

function printInvalidCharacterError(char) {
  console.log(`Character ${char} is invalid, the QR code couldn't be generated.`);
}

/* ######################## LEVEL AND VERSION CALCULATOR FUNCTIONS ######################## */

function getLevel(len) {
  if (len <= LEVEL_VERSION_DATA.H[40].totalCapacity) return 'H';
  if (len <= LEVEL_VERSION_DATA.Q[40].totalCapacity) return 'Q';
  if (len <= LEVEL_VERSION_DATA.M[40].totalCapacity) return 'M';
  return 'L'; 
}

function versionBinarySearch(level, len, currentVersion, low, high) {
  let currentMax = LEVEL_VERSION_DATA[level][currentVersion].totalCapacity;
  let previousMax = currentVersion == 1 ? 0 : LEVEL_VERSION_DATA[level][currentVersion - 1].totalCapacity;

  // Found
  if (currentMax >= len && previousMax < len) return currentVersion;

  // Calculate next higher/lower bound
  if (currentMax < len) low = currentVersion + 1;
  else high = currentVersion - 1;

  // Unnecessary check for not found
  if (low > high) return;

  // Calculate next middle
  let mid = Math.floor((low + high) / 2); 

  return versionBinarySearch(level, len, mid, low, high);
}

/* ######################## MODE ENCODING FUNCTIONS ######################## */

/*
  How to encode:
    - Pair:
        firstChar.value * 45 + secondChar.value then convert to 11 bits
    - Single:
        firstChar.value then convert to 6 bits
*/
function modeEncoder(str, len, version) {
  // Start with mode and char count bits
  let result = initializeEncodedString(len, version);
  
  for (let i = 0; i < len; i += 2) {
    let char1 = ALPHANUMERIC_TABLE[str[i]];
    if (char1 === undefined) {
      printInvalidCharacterError(str[i]);
      return INVALID_CHARACTER;
    }

    // Single last value of odd string
    if (i === len - 1) {
      result += valueToBitString(char1, 6);
    }
    // Pair value calculation
    else {
      char1 *= 45;

      let char2 = ALPHANUMERIC_TABLE[str[i + 1]];
      if (char2 === undefined) {
        printInvalidCharacterError(str[i + 1]);
        return INVALID_CHARACTER;
      }

      result += valueToBitString(char1 + char2, 11);
    }
  }

  return result;
}

function valueToBitString(val, bits) {
  let bitString = val.toString(2); // Converts value to binary string
  return bitString.padStart(bits, '0'); // Adds leading zeroes if needed
}

function initializeEncodedString(len, version) {
  // Add mode bits
  let result = MODE_INDICATORS.alphanumeric;

  // Add character count bits
  return result + calculateCharacterCountBits(len, version);
}

function calculateCharacterCountBits(len, version) {
  let bits = 13;

  if (version <= 9) bits = 9;
  else if (version <= 26) bits = 11;

  return len.toString(2).padStart(bits, '0');
}

/* ######################## TERMINATOR AND PAD BYTES FUNCTIONS ######################## */

function completeRawDataBits(str, level, version) {
  let requiredBits = LEVEL_VERSION_DATA[level][version].totalDataCodewords * 8;

  str = addTerminatorBits(str, requiredBits);
  str = makeMultipleOf8(str, requiredBits);
  str = addPadBytes(str, requiredBits);

  return str;
}

/*
  Get the version-level codewords number and multiply it by 8.
  If the lenght of the encoded string is less than the result, then add a MAXIMUM of 4 zeroes to the end of it.
  If it differs by less than 4 bits, then only add the missing bits.
*/
function addTerminatorBits(str, totalBits) {
  let diff = totalBits - str.length;

  if (diff < 4) return str.padEnd(str.length + diff, '0');
  return str.padEnd(str.length + 4, '0');
}

/*
  If the string with the terminator bits is still shorter than the total, make it the next multiple of eight
  by adding zeroes to the end.
*/
function makeMultipleOf8(str, totalBits) {
  let remainder = str.length % 8;
  if (remainder === 0) return str;

  return str.padEnd(str.length + 8 - remainder, '0');
}

/*
  If the result string is still to short, add the pad bytes repeating until it reaches it.
*/
function addPadBytes(str, totalBits) {
  const byte1 = '11101100';
  const byte2 = '00010001';

  let len = str.length;
  if (len >= totalBits) return str;

  let iterations = (totalBits - len) / 8;

  for (let i = 0; i < iterations; i++) {
    if (i % 2 === 0) str += byte1;
    else str += byte2;
  }

  return str;
}

/* ######################## REED-SOLOMON ERROR CORRECTION FUNCTIONS ######################## */

function generateMessagePolynomial(bits) {
  let result = [];

  for (let i = 0; i < bits.length; i += 8) {
    let codeword = "";

    for (let j = i; j < i + 8; j++) {
      codeword += bits[j];
    }

    result.push(parseInt(codeword, 2));
  }

  return result;
}