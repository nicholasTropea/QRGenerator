/* ######################## MACROS ######################## */

const INVALID_LENGTH = -1;
const INVALID_CHARACTER = -2;
const RESERVED = '*';
const EMPTY_MODULE = '-';

/* ######################## IMPORTS ######################## */

// Raw data encoding
import {
  MODE_INDICATORS,
  ALPHANUMERIC_TABLE,
  LEVEL_VERSION_DATA,
  VERSION_REMAINDER_BITS,
  ALIGNMENT_PATTERN_LOCATIONS,
  FORMAT_INFO_STRINGS,
  VERSION_INFO_STRINGS
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
  let input = "Ciao topo";
  let inputLen = input.length;
  input = input.toUpperCase();

  let err = validateInput(input, inputLen);
  if (err === INVALID_LENGTH) return;

  let level = getLevel(inputLen);
  let version = versionBinarySearch(level, inputLen, 20, 1, 40); // Find minimum level required
  console.log("Version: " + version + "\nCorrection level: " + level + "\n");

  let selectedEntry = LEVEL_VERSION_DATA[level][version]; // Get table entry relative to this level and version

  let rawDataBits = modeEncoder(input, inputLen, version);
  if (rawDataBits === INVALID_CHARACTER) return;
  console.log("Encoded string: " + rawDataBits + "\n");

  rawDataBits = completeRawDataBits(rawDataBits, selectedEntry);
  console.log("Final raw data bits: " + rawDataBits + "\n");

  let messagePolynomials = generateMessagePolynomials(rawDataBits, selectedEntry);
  let errorBits = generateErrorCorrectionBits(messagePolynomials, selectedEntry);

  let finalMessage = composeFinalMessage(rawDataBits, errorBits, selectedEntry, version);

  console.log("Final message: " + finalMessage + "\n");

  let matrix = generateMatrix(finalMessage, version);
  printMatrix(matrix);
}

/* ######################## DEBUG ######################## */

function printMatrix(matrix) {
  let output = "";

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (j == matrix.length - 1) output += matrix[i][j] + "\n";
      else output += matrix[i][j] + " ";
    }
  }

  console.log(output + "\n");
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

function generateMatrix(bitstream, version) {
  let size = (version - 1) * 4 + 21;

  let matrix = Array.from({ length : size }, () => Array(size).fill(EMPTY_MODULE)); // Initializes a size x size matrix of undefined elements

  addFinderPatterns(matrix);
  addSeparators(matrix);
  addAlignmentPatterns(matrix, version);
  addTimingPatterns(matrix);
  matrix[size - 8][8] = 1; // Add dark module
  addReservedModules(matrix, version);
  addDataModules(matrix, bitstream);

  return matrix;
}

function addFinderPatterns(matrix) {
  function makeFinderFromTopLeft(matrix, start) {
    let x = start.x;
    let y = start.y;
    
    // Adds borders
    for (let i = x; i < x + 7; i++) matrix[y][i] = 1;
    for (let i = x; i < x + 7; i++) matrix[y + 6][i] = 1;
    for (let i = y + 1; i < y + 6; i++) matrix[i][x] = 1;
    for (let i = y + 1; i < y + 6; i++) matrix[i][x + 6] = 1;

    // Adds central square
    for (let i = y + 2; i < y + 5; i++) {
      for (let j = x + 2; j < x + 5; j++) matrix[i][j] = 1; 
    }

    // Adds white borders
    for (let i = x + 1; i < x + 6; i++) matrix[y + 1][i] = 0;
    for (let i = x + 1; i < x + 6; i++) matrix[y + 5][i] = 0;
    for (let i = y + 2; i < y + 5; i++) matrix[i][x + 1] = 0
    for (let i = y + 2; i < y + 5; i++) matrix[i][x + 5] = 0;
  }
  
  let size = matrix.length;

  makeFinderFromTopLeft(matrix, {x : 0, y : 0}); // Top-Left
  makeFinderFromTopLeft(matrix, {x : size - 7, y : 0}); // Top-Right
  makeFinderFromTopLeft(matrix, {x : 0, y : size - 7}); // Bottom-Left
}

function addSeparators(matrix) {
  let size = matrix.length;
  
  // Top-Left separators
  for (let i = 0; i < 8; i++) matrix[7][i] = 0;
  for (let i = 0; i < 7; i++) matrix[i][7] = 0;

  // Top-Right separators
  for (let i = size - 8; i < size; i++) matrix[7][i] = 0;
  for (let i = 0; i < 7; i++) matrix[i][size - 8] = 0;

  // Bottom-Left separators
  for (let i = 0; i < 8; i++) matrix[size - 8][i] = 0;
  for (let i = size - 7; i < size; i++) matrix[i][7] = 0;
}

function addAlignmentPatterns(matrix, version) {
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
    for (let i = x; i < x + 5; i++) matrix[y][i] = 1;
    for (let i = x; i < x + 5; i++) matrix[y + 4][i] = 1;
    for (let i = y + 1; i < y + 4; i++) matrix[i][x] = 1;
    for (let i = y + 1; i < y + 4; i++) matrix[i][x + 4] = 1;

    // Add center
    matrix[y + 2][x + 2] = 1;

    // Add white borders
    for (let i = x + 1; i < x + 4; i++) matrix[y + 1][i] = 0;
    for (let i = x + 1; i < x + 4; i++) matrix[y + 3][i] = 0;
    matrix[y + 2][x + 1] = 0;
    matrix[y + 2][x + 3] = 0;
  }

  if (version === 1) return;

  // Add all combinations of coordinates
  for (let coord1 of ALIGNMENT_PATTERN_LOCATIONS[version]) {
    for (let coord2 of ALIGNMENT_PATTERN_LOCATIONS[version]) {
      makeAlignmentPatternByCenter(matrix, { x : coord1, y : coord2});
    }
  }
}

function addTimingPatterns(matrix) {
  let size = matrix.length;
  
  // Add horizontal pattern
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) matrix[6][i] = 1;
    else matrix[6][i] = 0;
  }

  // Add vertical pattern
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) matrix[i][6] = 1;
    else matrix[i][6] = 0;
  }
}

function addReservedModules(matrix, version) {
  let size = matrix.length;

  // Top-Right strip
  for (let i = size - 8; i < size; i++) matrix[8][i] = RESERVED;

  // Top-Left strips
  for (let i = 0; i < 9; i++) {
    if (i === 6) continue;
    matrix[i][8] = RESERVED;
  }

  for (let i = 0; i < 8; i++) {
    if (i === 6) continue;
    matrix[8][i] = RESERVED;
  }

  // Bottom-Left strip
  for (let i = size - 7; i < size; i++) matrix[i][8] = RESERVED;

  if (version < 7) return; // Early exit

  // Top-Right area
  for (let i = 0; i < 6; i++) {
    for (let j = size - 11; j < size - 8; j++) matrix[i][j] = RESERVED;
  }

  // Bottom-Left area
  for (let i = size - 11; i < size - 8; i++) {
    for (let j = 0; j < 6; j++) matrix[i][j] = RESERVED;
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
          if (matrix[row][col] === EMPTY_MODULE) {
            matrix[row][col] = bits.shift();
            // printMatrix(matrix);
            // console.log(bits.length);
          }
          else continue;
        }
      }

      dir = DOWNWARDS;
    }
    else {
      for (let row = 0; row < size; row++) {
        for (let col = rightCol; col >= rightCol - 1; col--) {
          if (matrix[row][col] === EMPTY_MODULE) {
            matrix[row][col] = bits.shift();
            // printMatrix(matrix);
            // console.log(bits.length);
          }
          else continue;
        }
      }

      dir = UPWARDS;
    }

    rightCol = rightCol == 8 ? 5 : rightCol - 2;
  }
}