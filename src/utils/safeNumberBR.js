/**
 * Safely parses Brazilian number formats to JavaScript numbers
 * Handles various formats including:
 * - "R$ 1.234,56" (Brazilian currency)
 * - "1.234,56" (Brazilian decimal)
 * - "1,234.56" (US decimal)
 * - 12345.67 (plain number)
 * 
 * @param {string|number} value - The value to parse
 * @returns {number} The parsed number or 0 if invalid
 */
export const safeNumberBR = (value) => {
  // Already a number
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  // Null or undefined
  if (value === null || value === undefined) {
    return 0;
  }
  
  // Convert to string and clean
  const str = String(value).trim();
  if (str === '') return 0;
  
  // Remove common prefixes (R$, $), parentheses, and spaces
  let cleaned = str
    .replace(/R\$/gi, '')
    .replace(/\$/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '')
    .trim();
  
  // Empty after cleaning
  if (cleaned === '') return 0;
  
  // Detect format based on structure
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Has both separators - determine which is decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Brazilian format: 1.234.567,89
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234,567.89
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Only comma - could be decimal or thousands separator
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal: 1234,56
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator: 1,234 or 1,234,567
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Only dot - could be decimal or thousands separator
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length === 2) {
      // Likely decimal: 1234.56
      // Keep as is
    } else if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      // Likely thousands separator: 1.234 or 1.234.567
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Formats a number as Brazilian currency (R$)
 * 
 * @param {string|number} value - The value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrencyBR = (value) => {
  const numValue = safeNumberBR(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

/**
 * Quick self-test function for development
 * @returns {boolean} True if all tests pass
 */
export const testSafeNumberBR = () => {
  const tests = [
    { input: 1234.56, expected: 1234.56 },
    { input: '1234.56', expected: 1234.56 },
    { input: '1.234,56', expected: 1234.56 },
    { input: 'R$ 1.234,56', expected: 1234.56 },
    { input: '1,234.56', expected: 1234.56 },
    { input: 'R$ 12.345,67', expected: 12345.67 },
    { input: '0', expected: 0 },
    { input: '', expected: 0 },
    { input: null, expected: 0 },
    { input: undefined, expected: 0 },
    { input: '49116.38', expected: 49116.38 },
    { input: '5893.97', expected: 5893.97 },
  ];
  
  let allPassed = true;
  tests.forEach(({ input, expected }, index) => {
    const result = safeNumberBR(input);
    const passed = Math.abs(result - expected) < 0.01;
    if (!passed) {
      console.error(`Test ${index + 1} failed:`, { input, expected, result });
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('✓ All safeNumberBR tests passed');
  }
  
  return allPassed;
};

/**
 * Detects if a value is truly missing (null/undefined) vs a legitimate zero
 * Useful for distinguishing between absent data and actual zero values
 * 
 * @param {any} originalValue - The original value before parsing
 * @param {number} parsedValue - The parsed numeric value
 * @returns {boolean} True if the value was missing (null/undefined/empty) and parsed to 0
 */
export const detectMissing = (originalValue, parsedValue) => {
  // If parsed value is not 0, it's not missing
  if (parsedValue !== 0) {
    return false;
  }
  
  // Check if original value was null, undefined, or empty string
  if (originalValue === null || originalValue === undefined || originalValue === '') {
    return true;
  }
  
  // If it's a string, check if it's just whitespace
  if (typeof originalValue === 'string' && originalValue.trim() === '') {
    return true;
  }
  
  // Otherwise, it's a legitimate zero
  return false;
};

/**
 * Safely parses a value and returns both the number and missing status
 * 
 * @param {string|number} value - The value to parse
 * @returns {Object} Object with { value: number, isMissing: boolean }
 */
export const safeNumberBRWithMeta = (value) => {
  const parsed = safeNumberBR(value);
  const isMissing = detectMissing(value, parsed);
  
  return {
    value: parsed,
    isMissing
  };
};

export default safeNumberBR;
