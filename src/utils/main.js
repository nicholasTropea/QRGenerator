/* ######################## MACROS ######################## */

const INVALID_LENGTH = -1;
const INVALID_CHARACTER = -2;
const RESERVED = '*';
const EMPTY_MODULE = '-';
const FREE_MODULE = -3;
const OCCUPIED_MODULE = -4;
const MODE_ENCODER_FAILURE = -5;
const KANJI_HEX_FAILURE = -6;

/* ######################## IMPORTS ######################## */

// Raw data encoding
import {
  MODE_INDICATORS,
  TOTAL_CAPACITIES,
  ALPHANUMERIC_TABLE,
  LEVEL_VERSION_DATA,
  VERSION_REMAINDER_BITS,
  ALIGNMENT_PATTERN_LOCATIONS,
  FORMAT_INFO_STRINGS,
  VERSION_INFO_STRINGS,
  MASK_FUNCTIONS,
  CHARACTER_COUNT_INDICATORS_SIZE
} from "./raw_data_encoding_constants.js";

// Reed-Solomon error correction
import {
  LOG_ANTILOG_TABLE,
  GEN_POLYNOMIALS
} from "./reed_solomon_constants.js";

// Kanji mode encoding
import { shiftJISMap } from './kanji_mode_characters_table.js';

/* ######################## MAIN ######################## */

export default function main(input = '') {
  console.log("Function called")
  let inputLen = input.length;

  // Get mode
  let mode = calculateEncodingMode(input);
  if (mode === INVALID_CHARACTER) return;
  if (mode === "alphanumeric") input = input.toUpperCase();
  if (mode === "kanji") input = input.replace(/ /g, '　'); // Changes any 'normal' space into 'japanese' space

  // Validate input
  let err = validateInput(inputLen, mode);
  if (err === INVALID_LENGTH) return;

  // Get max level and min version
  let level = getLevel(inputLen, mode);
  let version = versionBinarySearch(mode, level, inputLen, 20, 1, 40); // Find minimum level required
  console.log(`Version: ${version}\nCorrection level: ${level}\nEncoding mode: ${mode}\n`);

  let selectedEntry = LEVEL_VERSION_DATA[level][version]; // Get table entry relative to this level and version

  // Calculate data codewords
  let rawDataBits = modeEncoder(input, inputLen, version, mode);
  if (rawDataBits === MODE_ENCODER_FAILURE) return;

  rawDataBits = completeRawDataBits(rawDataBits, selectedEntry);

  let messagePolynomials = generateMessagePolynomials(rawDataBits, selectedEntry);

  // Calculate error correction codewords
  let errorBits = generateErrorCorrectionBits(messagePolynomials, selectedEntry);

  // Compose the final bitstream
  let finalMessage = composeFinalMessage(rawDataBits, errorBits, selectedEntry, version);

  // Generate qr code matrix
  let matrix = generateMatrix(finalMessage, version, level);

  return matrix;
}

/* ######################## DEBUG ######################## */

function printMatrixNumbers(matrix) {
  let output = "";

  // Print top white border
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < matrix.length + 8; j++) output += '0';
    output += "\n";
  }

  // Print actual matrix and side borders
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < 4; j++) output += '0'; // Left white border

    for (let j = 0; j < matrix.length; j++) {
      if (matrix[i][j] === 1) output += '1'; // White for QR black modules
      else output += '0'; // Black for QR white modules
    }

    for (let j = 0; j < 4; j++) output += '0'; // Right white border

    output += "\n";
  }

  // Print bottom white border
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < matrix.length + 8; j++) output += '0';
    output += "\n";
  }

  console.log(output);
}

function printMatrix(matrix) {
  const WHITE_BG = '\x1b[47m';  // White background for black modules
  const BLACK_BG = '\x1b[40m';  // Black background for white modules  
  const RESET = '\x1b[0m';
  let output = "";

  // Print top white border
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < matrix.length + 8; j++) output += WHITE_BG + "  " + RESET;
    output += "\n";
  }

  // Print actual matrix and side borders
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < 4; j++) output += WHITE_BG + "  " + RESET; // Left white border

    for (let j = 0; j < matrix.length; j++) {
      if (matrix[i][j] === 1) output += BLACK_BG + "  " + RESET; // White for QR black modules
      else output += WHITE_BG + "  " + RESET; // Black for QR white modules
    }

    for (let j = 0; j < 4; j++) output += WHITE_BG + "  " + RESET; // Right white border

    output += "\n";
  }

  // Print bottom white border
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < matrix.length + 8; j++) output += WHITE_BG + "  " + RESET;
    output += "\n";
  }

  console.log(output);
}

/* ######################## UTILITIES ######################## */

function validateInput(len, mode) {
  if (len == 0) return INVALID_LENGTH;

  // Input longer than max input for selected mode
  if (len > TOTAL_CAPACITIES['L'][40][mode]) { 
    console.log("The input is too long, I can't generate a QR code!");
    return INVALID_LENGTH;
  }

  return 0;
}

function printInvalidCharacterError(char) {
  console.log(`Character ${char} is invalid, the QR code couldn't be generated.`);
  console.log("For a list of all the valid characters, check the ISO-8859-1 character set!");
}

function copyMatrix(m1, m2) {
  for (let i = 0; i < m1.length; i++) {
    for (let j = 0; j < m1.length; j++) m2[i][j] = m1[i][j];
  }
}

/* ######################## MODE, LEVEL AND VERSION CALCULATOR FUNCTIONS ######################## */

/*
  Note that byte mode is probably a fallback mode, meaning that it can encode basically any character
*/
function calculateEncodingMode(str) {
  if (/^\d+$/.test(str)) return "numeric";
  if (/^[0-9A-Z $%*+\-.\/:]*$/.test(str)) return "alphanumeric";
  if (checkKanjiString(str)) return "kanji";
  if (/^[\x00-\xFF]*$/.test(str)) return "byte";
  
  // If not passed, loop again to find invalid character
  for (let char of str) {
    if (char.charCodeAt(0) > 255 && !checkKanjiString(char)) { // Finds the invalid character (not in ISO-8859-1 or Shift-JIS)
      printInvalidCharacterError(char);
      return INVALID_CHARACTER;
    }
  }

  return INVALID_CHARACTER; // Fallback, function shouldn't reach this
}

/*
  Checks wether the passed string is made out of Shift-JIS (Shift Japanese Industrial Standard) 2 byte characters.
*/
function checkKanjiString(str) {
  for (let char of str) if (!shiftJISMap[char] && char !== ' ') return false;
  return true;
}

function getLevel(len, mode) {
  // Version 40 has the highest capacity for each level
  if (len <= TOTAL_CAPACITIES['H'][40][mode]) return 'H';
  if (len <= TOTAL_CAPACITIES['Q'][40][mode]) return 'Q';
  if (len <= TOTAL_CAPACITIES['M'][40][mode]) return 'M';
  return 'L'; 
}

function versionBinarySearch(mode, level, len, currentVersion, low, high) {
  let currentMax = TOTAL_CAPACITIES[level][currentVersion][mode];
  let previousMax = currentVersion == 1 ? 0 : TOTAL_CAPACITIES[level][currentVersion - 1][mode];

  // Found
  if (currentMax >= len && previousMax < len) return currentVersion;

  // Calculate next higher/lower bound
  if (currentMax < len) low = currentVersion + 1;
  else high = currentVersion - 1;

  // Unnecessary check for not found
  if (low > high) return;

  // Calculate next middle
  let mid = Math.floor((low + high) / 2); 

  return versionBinarySearch(mode, level, len, mid, low, high);
}

/* ######################## MODE ENCODING FUNCTIONS ######################## */

function modeEncoder(str, len, version, mode) {
  // Start with mode and character count bits
  let initializedString = initializeEncodedString(len, version, mode);
  
  if (mode === "numeric") return initializedString + numericEncoder(str, len);
  if (mode === "alphanumeric") return initializedString + alphanumericEncoder(str, len);
  if (mode === "byte") return initializedString + byteEncoder(str);
  if (mode === "kanji") {
    let res = kanjiEncoder(str);
    return res === KANJI_HEX_FAILURE ? KANJI_HEX_FAILURE : initializedString + res; 
  }

  return MODE_ENCODER_FAILURE; // Fallback, shouldn't reach here
}

function valueToBitString(val, bits) {
  let bitString = val.toString(2); // Converts value to binary string
  return bitString.padStart(bits, '0'); // Adds leading zeroes if needed
}

function initializeEncodedString(len, version, mode) {
  // Add mode bits
  let result = MODE_INDICATORS[mode];

  // Add character count bits
  return result + calculateCharacterCountBits(len, version, mode);
}

function calculateCharacterCountBits(len, version, mode) {
  let bits;

  if (version <= 9) bits = CHARACTER_COUNT_INDICATORS_SIZE['1to9'][mode];
  else if (version <= 26) bits = CHARACTER_COUNT_INDICATORS_SIZE['10to26'][mode];
  else bits = CHARACTER_COUNT_INDICATORS_SIZE['27to40'][mode];

  return len.toString(2).padStart(bits, '0');
}

/*
  Alphanumeric encoding:
    - Pair:
        firstChar.value * 45 + secondChar.value then convert to 11 bits
    - Single:
        firstChar.value then convert to 6 bits
*/
function alphanumericEncoder(str, len) {
  let result = "";

  for (let i = 0; i < len; i += 2) {
    let char1 = ALPHANUMERIC_TABLE[str[i]];

    // Single last value of odd string
    if (i === len - 1) result += valueToBitString(char1, 6);
    // Pair value calculation
    else {
      char1 *= 45;

      let char2 = ALPHANUMERIC_TABLE[str[i + 1]];

      result += valueToBitString(char1 + char2, 11);
    }
  }

  return result;
}

/*
  Numeric encoding:
    - Three digits number: convert to 10 binary bits
    - Two digits number: convert to 7 binary bits
    - One digit number : convert to 4 binary bits

    (If a triple starts with 0s, get rid of them)
    (If len is not a multiple of 3, the last iteration will consider a couple or a single digit)
*/
function numericEncoder(str, len) {
  let result = "";

  for (let i = 0; i < len; i += 3) {
    const chars = str.slice(i, i + 3); // Grab up to 3 digits from string

    let val = Number(chars); // Convert to integer, if there are leading zeroes they are removed
    
    if (chars.length === 3) result += val.toString(2).padStart(10, '0');
    else if (chars.length === 2) result += val.toString(2).padStart(7, '0');
    else result += val.toString(2).padStart(4, '0');
  }

  return result;
}

/*
  Byte encoding:
    Get each character and convert it to its ISO 8859-1, then into binary and pad it until 8 bits long
*/
function byteEncoder(str) {
  let result = "";

  for (let char of str) result += char.charCodeAt(0).toString(2).padStart(8, '0');

  return result;
}

/*
  Kanji encoding:
    1) Convert the character to bytes. (Example: 茗 -> 0xE4AA or 荷 -> 0x89D7) 
    2) Divide based on:
      - 0x8140 <= val <= 0x9FFC (Example: 荷 -> 0x89D7)
        1) Subtract 0x8140 from val. (Example: 0x89D7 - 0x8140 = 0x0897)
        2) Multiply most significant byte of result by 0xC0 (Example: 0x08 * 0xC0 = 0x600)
        3) Sum the least significant byte to the result (Example: 0x600 + 0x97 = 0x697)
        4) Convert result to 13 bit binary (Example: 0x697 = 0 0110 1001 0111)

      - 0xE040 <= val <= 0xEBBF (Example: 茗 -> 0xE4AA)
        1) Subtract 0xC140 from val. (Example: 0xE4AA - 0xC140 = 0x236A)
        2) Multiply most significant byte of result by 0xC0 (Example: 0x23 * 0xC0 = 0x1A40)
        3) Sum the least significant byte to the result (Example: 0x1A40 + 0x6A = 0x1AAA)
        4) Convert result to 13 bit binary (Example: 0x1AAA) = 1 1010 1010 1010
*/
function kanjiEncoder(str) {
  let result = "";

  for (let char of str) {
    let hexValue = shiftJISMap[char];

    if (0x8140 <= hexValue && hexValue <= 0x9FFC) hexValue -= 0x8140;
    else if (0xE040 <= hexValue && hexValue <= 0xEBBF) hexValue -= 0xC140;
    else return KANJI_HEX_FAILURE; // Fallback, shouldn't reach here

    let mostSignificantByte = (hexValue >> 8) & 0xFF;
    let leastSignificantByte = hexValue & 0xFF;

    let res = (mostSignificantByte * 0xC0) + leastSignificantByte;

    result += res.toString(2).padStart(13, '0');
  }

  return result;
}

/* ######################## TERMINATOR AND PAD BYTES FUNCTIONS ######################## */

function completeRawDataBits(str, entry) {
  let requiredBits = entry.totalDataCodewords * 8;

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

function generateMessagePolynomials(bits, entry) {
  let result = [];
  let bitIndex = 0;

  // First group
  for (let i = 0; i < entry.group1Blocks; i++) {
    let msgPoly = [];

    for (let j = 0; j < entry.group1DataCodewords; j++) {
      let codewordBits = bits.slice(bitIndex, bitIndex + 8);
      msgPoly.push(parseInt(codewordBits, 2));
      bitIndex += 8;
    }

    result.push(msgPoly);
  }

  // Second group (if any)
  for (let i = 0; i < entry.group2Blocks; i++) {
    let msgPoly = [];

    for (let j = 0; j < entry.group2DataCodewords; j++) {
      let codewordBits = bits.slice(bitIndex, bitIndex + 8);
      msgPoly.push(parseInt(codewordBits, 2));
      bitIndex += 8;
    }

    result.push(msgPoly);
  }

  return result;
}

function generateErrorCorrectionBits(messagePolynomials, entry) {
  let result = [];
  for (let poly of messagePolynomials) result.push(divideMessagePolynomial(poly, entry));
  return result; 
}

function divideMessagePolynomial(messagePolynomial, entry) {
  // Get the number of error correction codewords needed
  let errorCorrectionCodewords = entry.ecCodewordsPerBlock;
  
  // Get the generator polynomial for this number of error correction codewords
  let generatorPolynomial = GEN_POLYNOMIALS[errorCorrectionCodewords];
  
  // Create a copy of the message polynomial and pad with zeros
  let dividend = [...messagePolynomial];
  
  // Pad the dividend with zeros (degree of generator polynomial)
  for (let i = 0; i < generatorPolynomial.length - 1; i++) dividend.push(0);
  
  // Perform polynomial long division in GF(256)
  for (let i = 0; i < messagePolynomial.length; i++) {
    let leadCoeff = dividend[i];
    
    if (leadCoeff !== 0) {
      // Convert to log form for multiplication
      let logLeadCoeff = LOG_ANTILOG_TABLE[leadCoeff].log;
      
      // Multiply generator polynomial by lead coefficient and subtract
      for (let j = 0; j < generatorPolynomial.length; j++) {
        if (generatorPolynomial[j] !== 0) {
          // Multiply in log domain (add logs)
          let logProduct = (logLeadCoeff + generatorPolynomial[j]) % 255;
          // Convert back to antilog and XOR (subtract in GF(256))
          dividend[i + j] ^= LOG_ANTILOG_TABLE[logProduct].antilog;
        }
      }
    }
  }
  
  // The remainder is the error correction codewords
  errorCorrectionCodewords = dividend.slice(messagePolynomial.length);
  
  return errorCorrectionCodewords;
}

/* ######################## FINAL MESSAGE COMPOSITION FUNCTIONS ######################## */

function composeFinalMessage(dataCodewords, errorCodewords, entry, version) {
  dataCodewords = splitIntoBlocks(dataCodewords, entry);

  // If only 1 group it still removes the inner array
  dataCodewords = interleaveCodewords(dataCodewords);
  errorCodewords = interleaveCodewords(errorCodewords);

  let finalCodewords = [...dataCodewords, ...errorCodewords];

  let finalMessageString = binaryFromCodewordArray(finalCodewords);
  finalMessageString = addRemainderBits(finalMessageString, version);

  return finalMessageString;
}

function splitIntoBlocks(str, entry) {
  let result = [];
  let bitIndex = 0;

  // Iterate over first group
  for (let i = 0; i < entry.group1Blocks; i++) {
    let block = [];

    for (let j = 0; j < entry.group1DataCodewords; j++) {
      let codeword = "";
      
      for (let k = bitIndex; k < bitIndex + 8; k++) codeword += str[k];

      bitIndex += 8;

      block.push(parseInt(codeword, 2));
    }

    result.push(block);
  }

  // Iterate over second group (if any)
  for (let i = 0; i < entry.group2Blocks; i++) {
    let block = [];

    for (let j = 0; j < entry.group2DataCodewords; j++) {
      let codeword = "";
      
      for (let k = bitIndex; k < bitIndex + 8; k++) codeword += str[k];

      bitIndex += 8;

      block.push(parseInt(codeword, 2));
    }

    result.push(block);
  }

  return result;
}

function interleaveCodewords(codewords) {
  let result = [];

  while (codewords.some(arr => arr.length > 0)) {
    for (let i = 0; i < codewords.length; i++) {
      if (codewords[i].length != 0) result.push(codewords[i].shift());
    }
  }

  return result;
}

function binaryFromCodewordArray(arr) {
  let result = "";

  for (let codeword of arr) {
    let str = codeword.toString(2);
    result += str.padStart(8, '0');
  }

  return result;
}

function addRemainderBits(str, version) {
  return str + '0'.repeat(VERSION_REMAINDER_BITS[version]);
}

/* ######################## MATRIX GENERATION FUNCTIONS ######################## */

function generateMatrix(bitstream, version, level) {
  let size = (version - 1) * 4 + 21;

  let matrix = Array.from({ length : size }, () => Array(size).fill(EMPTY_MODULE)); // Initializes a size x size matrix of undefined elements
  let availabilityMatrix = Array.from({ length : size }, () => Array(size).fill(FREE_MODULE)); // Initializes the mask matrix

  addFinderPatterns(matrix, availabilityMatrix);
  addSeparators(matrix, availabilityMatrix);
  addAlignmentPatterns(matrix, availabilityMatrix, version);
  addTimingPatterns(matrix, availabilityMatrix);

  // Add dark module
  matrix[size - 8][8] = 1; 
  availabilityMatrix[size - 8][8] = OCCUPIED_MODULE; 

  addReservedModules(matrix, availabilityMatrix, version);
  addDataModules(matrix, bitstream);
  calculateAndApplyMask(matrix, availabilityMatrix, level);
  
  return matrix;
}

function addFinderPatterns(matrix, availabilityMatrix) {
  function makeFinderFromTopLeft(matrix, start) {
    let x = start.x;
    let y = start.y;
    
    // Adds borders
    for (let i = x; i < x + 7; i++) {
      matrix[y][i] = 1;
      availabilityMatrix[y][i] = OCCUPIED_MODULE;
    }
    for (let i = x; i < x + 7; i++) {
      matrix[y + 6][i] = 1;
      availabilityMatrix[y + 6][i] = OCCUPIED_MODULE;
    }
    for (let i = y + 1; i < y + 6; i++) {
      matrix[i][x] = 1;
      availabilityMatrix[i][x] = OCCUPIED_MODULE;
    }
    for (let i = y + 1; i < y + 6; i++) {
      matrix[i][x + 6] = 1;
      availabilityMatrix[i][x + 6] = OCCUPIED_MODULE;
    }

    // Adds central square
    for (let i = y + 2; i < y + 5; i++) {
      for (let j = x + 2; j < x + 5; j++) {
        matrix[i][j] = 1; 
        availabilityMatrix[i][j] = OCCUPIED_MODULE;
      }
    }

    // Adds white borders
    for (let i = x + 1; i < x + 6; i++) {
      matrix[y + 1][i] = 0;
      availabilityMatrix[y + 1][i] = OCCUPIED_MODULE;
    }
    for (let i = x + 1; i < x + 6; i++) {
      matrix[y + 5][i] = 0;
      availabilityMatrix[y + 5][i] = OCCUPIED_MODULE;
    }
    for (let i = y + 2; i < y + 5; i++) {
      matrix[i][x + 1] = 0
      availabilityMatrix[i][x + 1] = OCCUPIED_MODULE;
    }
    for (let i = y + 2; i < y + 5; i++) {
      matrix[i][x + 5] = 0;
      availabilityMatrix[i][x + 5] = OCCUPIED_MODULE;
    }
  }
  
  let size = matrix.length;

  makeFinderFromTopLeft(matrix, {x : 0, y : 0}); // Top-Left
  makeFinderFromTopLeft(matrix, {x : size - 7, y : 0}); // Top-Right
  makeFinderFromTopLeft(matrix, {x : 0, y : size - 7}); // Bottom-Left
}

function addSeparators(matrix, availabilityMatrix) {
  let size = matrix.length;
  
  // Top-Left separators
  for (let i = 0; i < 8; i++) {
    matrix[7][i] = 0;
    availabilityMatrix[7][i] = OCCUPIED_MODULE;
  }
  for (let i = 0; i < 7; i++) {
    matrix[i][7] = 0;
    availabilityMatrix[i][7] = OCCUPIED_MODULE;
  }

  // Top-Right separators
  for (let i = size - 8; i < size; i++) {
    matrix[7][i] = 0;
    availabilityMatrix[7][i] = OCCUPIED_MODULE;
  }
  for (let i = 0; i < 7; i++) {
    matrix[i][size - 8] = 0;
    availabilityMatrix[i][size - 8] = OCCUPIED_MODULE;
  }

  // Bottom-Left separators
  for (let i = 0; i < 8; i++) {
    matrix[size - 8][i] = 0;
    availabilityMatrix[size - 8][i] = OCCUPIED_MODULE;
  }
  for (let i = size - 7; i < size; i++) {
    matrix[i][7] = 0;
    availabilityMatrix[i][7] = OCCUPIED_MODULE;
  }
}

function addAlignmentPatterns(matrix, availabilityMatrix, version) {
  function makeAlignmentPatternByCenter(matrix, center) {
    let size = matrix.length;

    // Convert to top-left coordinates
    let x = center.x - 2;
    let y = center.y - 2;

    // Check for interferences (don't include)
    if (x <= 7 && y <= 7) return; // Top-Left interference
    if (x <= 7 && y + 4 >= size - 8) return; // Bottom-Left interference
    if (x + 4 >= size - 8 && y <= 7) return; // Top-Right interference

    // Add black borders
    for (let i = x; i < x + 5; i++) {
      matrix[y][i] = 1;
      availabilityMatrix[y][i] = OCCUPIED_MODULE;
    }
    for (let i = x; i < x + 5; i++) {
      matrix[y + 4][i] = 1;
      availabilityMatrix[y + 4][i] = OCCUPIED_MODULE;
    }
    for (let i = y + 1; i < y + 4; i++) {
      matrix[i][x] = 1;
      availabilityMatrix[i][x] = OCCUPIED_MODULE;
    }
    for (let i = y + 1; i < y + 4; i++) {
      matrix[i][x + 4] = 1;
      availabilityMatrix[i][x + 4] = OCCUPIED_MODULE;
    }

    // Add center
    matrix[y + 2][x + 2] = 1;
    availabilityMatrix[y + 2][x + 2] = OCCUPIED_MODULE;

    // Add white borders
    for (let i = x + 1; i < x + 4; i++) {
      matrix[y + 1][i] = 0;
      availabilityMatrix[y + 1][i] = OCCUPIED_MODULE;
    }
    for (let i = x + 1; i < x + 4; i++) {
      matrix[y + 3][i] = 0;
      availabilityMatrix[y + 3][i] = OCCUPIED_MODULE;
    }
    matrix[y + 2][x + 1] = 0;
    matrix[y + 2][x + 3] = 0;
    availabilityMatrix[y + 2][x + 1] = OCCUPIED_MODULE;
    availabilityMatrix[y + 2][x + 3] = OCCUPIED_MODULE;
  }

  if (version === 1) return;

  // Add all combinations of coordinates
  for (let coord1 of ALIGNMENT_PATTERN_LOCATIONS[version]) {
    for (let coord2 of ALIGNMENT_PATTERN_LOCATIONS[version]) {
      makeAlignmentPatternByCenter(matrix, { x : coord1, y : coord2});
    }
  }
}

function addTimingPatterns(matrix, availabilityMatrix) {
  let size = matrix.length;
  
  // Add horizontal pattern
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) matrix[6][i] = 1;
    else matrix[6][i] = 0;
    availabilityMatrix[6][i] = OCCUPIED_MODULE;
  }

  // Add vertical pattern
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) matrix[i][6] = 1;
    else matrix[i][6] = 0;
    availabilityMatrix[i][6] = OCCUPIED_MODULE;
  }
}

function addReservedModules(matrix, availabilityMatrix, version) {
  let size = matrix.length;

  // Top-Right strip
  for (let i = size - 8; i < size; i++) {
    matrix[8][i] = RESERVED;
    availabilityMatrix[8][i] = OCCUPIED_MODULE;
  }

  // Top-Left strips
  for (let i = 0; i < 9; i++) {
    if (i === 6) continue;
    matrix[i][8] = RESERVED;
    availabilityMatrix[i][8] = OCCUPIED_MODULE;
  }

  for (let i = 0; i < 8; i++) {
    if (i === 6) continue;
    matrix[8][i] = RESERVED;
    availabilityMatrix[8][i] = OCCUPIED_MODULE;
  }

  // Bottom-Left strip
  for (let i = size - 7; i < size; i++) {
    matrix[i][8] = RESERVED;
    availabilityMatrix[i][8] = OCCUPIED_MODULE;
  }

  if (version < 7) return; // Early exit

  // Add version modules 
  let bits = VERSION_INFO_STRINGS[version].split("").map(Number);
  let k = bits.length - 1;

  // Fill Top-Right area
  for (let i = 0; i < 6; i++) {
    for (let j = size - 11; j < size - 8; j++) {
      matrix[i][j] = bits[k--];
      availabilityMatrix[i][j] = OCCUPIED_MODULE;
    }
  }

  // Fill Bottom-Left area
  for (let i = 0; i < 6; i++) {
    for (let j = size - 11; j < size - 8; j++) {
      matrix[j][i] = bits.pop();
      availabilityMatrix[j][i] = OCCUPIED_MODULE;
    }
  }
}

function addDataModules(matrix, bitstream) {
  const UPWARDS = true;
  const DOWNWARDS = false;
  
  let size = matrix.length;
  let rightCol = size - 1;
  let dir = UPWARDS;

  let bits = bitstream.split("").map(Number); // Convert bitstream string to array of numbers

  while (rightCol - 1 !== -2) {
    if (dir === UPWARDS) {
      for (let row = size - 1; row >= 0; row--) {
        for (let col = rightCol; col >= rightCol - 1; col--) {
          if (matrix[row][col] === EMPTY_MODULE) matrix[row][col] = bits.shift();
          else continue;
        }
      }

      dir = DOWNWARDS;
    }
    else {
      for (let row = 0; row < size; row++) {
        for (let col = rightCol; col >= rightCol - 1; col--) {
          if (matrix[row][col] === EMPTY_MODULE) matrix[row][col] = bits.shift();
          else continue;
        }
      }

      dir = UPWARDS;
    }

    rightCol = rightCol == 8 ? 5 : rightCol - 2; // If the next rightcol is the vertical timing pattern shift 1 to the left
  }
}

function calculateAndApplyMask(matrix, availabilityMatrix, level) {
  const size = matrix.length;

  function addFormatString(maskNumber) {
    const bits = FORMAT_INFO_STRINGS[maskNumber][level].split("").map(Number); // Convert format string to array

    // Add top-left bits
    for (let i = 0; i < 6; i++) testMatrix[8][i] = bits[i];
    testMatrix[8][7] = bits[6];
    testMatrix[8][8] = bits[7];
    testMatrix[7][8] = bits[8];
    for (let i = 0; i < 6; i++) testMatrix[i][8] = bits[14 - i];

    // Add top-right bits
    for (let i = 0; i < 8; i++) testMatrix[8][size - 1 - i] = bits[14 - i];

    // Add bottom-left bits
    for (let i = 0; i < 7; i++) testMatrix[size - 1 - i][8] = bits[i];
  }
  
  function calculatePenalty() {
    const FIRST_PENALTY_5_VALUE = 3;
    const FIRST_PENALTY_OVER_5_VALUE = 1;
    const SECOND_PENALTY_VALUE = 3;
    const THIRD_PENALTY_VALUE = 40;
    
    let totalPenalty = 0;
    
    // Tracks first penalty violations
    let firstPenalty = {
      lastVal : 0, // 0 or 1 doesn't make a difference as first value
      streak : 0
    };

    // Calculates second penalty violations
    function checkSquare(row, col) {
      if (col === size - 1 || row === size - 1) return false; // Early exit, last row or column

      if (testMatrix[row][col] !== testMatrix[row][col + 1]) return false; // Top-Right module
      if (testMatrix[row][col] !== testMatrix[row + 1][col]) return false; // Bottom-Left module
      if (testMatrix[row][col] !== testMatrix[row + 1][col + 1]) return false; // Bottom-Right module
      return true;
    }
    
    // Calculate third penalty patterns
    function checkAbovePattern(row, col) {
      if (testMatrix[row][col] === 1) {
        if (testMatrix[row - 1][col] !== 0) return false;
        if (testMatrix[row - 2][col] !== 1) return false;
        if (testMatrix[row - 3][col] !== 1) return false;
        if (testMatrix[row - 4][col] !== 1) return false;
        if (testMatrix[row - 5][col] !== 0) return false;
        if (testMatrix[row - 6][col] !== 1) return false;
        if (testMatrix[row - 7][col] !== 0) return false;
        if (testMatrix[row - 8][col] !== 0) return false;
        if (testMatrix[row - 9][col] !== 0) return false;
        if (testMatrix[row - 10][col] !== 0) return false;
      }
      else {
        if (testMatrix[row - 1][col] !== 0) return false;
        if (testMatrix[row - 2][col] !== 0) return false;
        if (testMatrix[row - 3][col] !== 0) return false;
        if (testMatrix[row - 4][col] !== 1) return false;
        if (testMatrix[row - 5][col] !== 0) return false;
        if (testMatrix[row - 6][col] !== 1) return false;
        if (testMatrix[row - 7][col] !== 1) return false;
        if (testMatrix[row - 8][col] !== 1) return false;
        if (testMatrix[row - 9][col] !== 0) return false;
        if (testMatrix[row - 10][col] !== 1) return false;
      }

      // Pattern found
      return true;
    }

    function checkLeftPattern(row, col) {
      if (testMatrix[row][col] === 1) {
        if (testMatrix[row][col - 1] !== 0) return false;
        if (testMatrix[row][col - 2] !== 1) return false;
        if (testMatrix[row][col - 3] !== 1) return false;
        if (testMatrix[row][col - 4] !== 1) return false;
        if (testMatrix[row][col - 5] !== 0) return false;
        if (testMatrix[row][col - 6] !== 1) return false;
        if (testMatrix[row][col - 7] !== 0) return false;
        if (testMatrix[row][col - 8] !== 0) return false;
        if (testMatrix[row][col - 9] !== 0) return false;
        if (testMatrix[row][col - 10] !== 0) return false;
      }
      else {
        if (testMatrix[row][col - 1] !== 0) return false;
        if (testMatrix[row][col - 2] !== 0) return false;
        if (testMatrix[row][col - 3] !== 0) return false;
        if (testMatrix[row][col - 4] !== 1) return false;
        if (testMatrix[row][col - 5] !== 0) return false;
        if (testMatrix[row][col - 6] !== 1) return false;
        if (testMatrix[row][col - 7] !== 1) return false;
        if (testMatrix[row][col - 8] !== 1) return false;
        if (testMatrix[row][col - 9] !== 0) return false;
        if (testMatrix[row][col - 10] !== 1) return false;
      }

      // Pattern found
      return true;
    }

    // Used to calculate the fourth penalty
    let blackModules = 0;

    // Calculates fourth penalty
    function calculateFourthPenalty() {
      let blackPercentage = Math.floor((blackModules / (matrix.length * matrix.length)) * 100);

      // Round to previous and next multiple of 5
      let prev = blackPercentage;
      let next = blackPercentage;

      while (prev % 5 != 0) prev--;
      while (next % 5 != 0) next++;

      // Subtract 50 and get abs value divided by 5
      prev = Math.abs(prev - 50) / 5;
      next = Math.abs(next - 50) / 5;

      // Calculate the penalty
      return Math.min(prev, next) * 10;
    }

    // Row penalty calculation (second and fourth are completely calculated here)
    for (let row = 0; row < matrix.length; row++) {
      // Reset first penalty
      firstPenalty.streak = 0;

      for (let col = 0; col < matrix.length; col++) {
        let value = testMatrix[row][col];

        // First penalty
        if (value === firstPenalty.lastVal) firstPenalty.streak++;
        else {
          firstPenalty.lastVal = value;
          firstPenalty.streak = 1;
        }

        if (firstPenalty.streak === 5) totalPenalty += FIRST_PENALTY_5_VALUE;
        else if (firstPenalty.streak > 5) totalPenalty += FIRST_PENALTY_OVER_5_VALUE;

        // Second penalty
        if (checkSquare(row, col)) totalPenalty += SECOND_PENALTY_VALUE;

        // Third penalty
        if (col >= 10) {
          if (checkLeftPattern(row, col)) totalPenalty += THIRD_PENALTY_VALUE;
        }
        
        // Fourth penalty
        if (value === 1) blackModules++;
      }
    }

    // Add fourth penalty
    totalPenalty += calculateFourthPenalty();
    
    // Column penalty calculation (first and third are completed here)
    for (let col = 0; col < matrix.length; col++) {
      // Reset first penalty
      firstPenalty.streak = 0;

      for (let row = 0; row < matrix.length; row++) {
        let value = testMatrix[row][col];

        // First penalty
        if (value === firstPenalty.lastVal) firstPenalty.streak++;
        else {
          firstPenalty.lastVal = value;
          firstPenalty.streak = 1;
        }

        if (firstPenalty.streak === 5) totalPenalty += FIRST_PENALTY_5_VALUE;
        else if (firstPenalty.streak > 5) totalPenalty += FIRST_PENALTY_OVER_5_VALUE;

        // Third penalty
        if (row >= 10) {
          if (checkAbovePattern(row, col)) totalPenalty += THIRD_PENALTY_VALUE;
        }
      }
    }

    return totalPenalty;
  }
  
  function applyMask(condition) {
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        if (availabilityMatrix[i][j] === OCCUPIED_MODULE) continue; // Skip non-data modules
        if (condition(i, j)) testMatrix[i][j] ^= 1; // XOR with 1 (reverses the bit)
      }
    }  
  }

  function changeMax(newPenalty, newMaskNum) {
    bestScore.penalty = newPenalty;
    bestScore.maskNumber = newMaskNum;
    copyMatrix(testMatrix, bestScore.matrix);
  }
  
  let testMatrix = Array.from({ length : size }, () => Array(size).fill(EMPTY_MODULE));  

  let bestScore = {
    maskNumber : undefined,
    penalty : Infinity,
    matrix : Array.from({ length : size }, () => Array(size).fill(EMPTY_MODULE))
  }

  // Apply masks and calculate best one
  for (let maskNumber = 0; maskNumber < 8; maskNumber++) {
    copyMatrix(matrix, testMatrix);
    addFormatString(maskNumber);
    applyMask(MASK_FUNCTIONS[maskNumber]);
    let maskPenalty = calculatePenalty();
    if (bestScore.penalty > maskPenalty) changeMax(maskPenalty, maskNumber);
  }

  copyMatrix(bestScore.matrix, matrix);  
}