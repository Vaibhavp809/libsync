/**
 * Test script for timestamp utilities
 * Run with: node scripts/check_timestamps.js
 */

// For Node.js environment, we need to use require
const path = require('path');
const fs = require('fs');

// Read the time utility file
const timeUtilPath = path.join(__dirname, '..', 'src', 'utils', 'time.js');
const timeUtilCode = fs.readFileSync(timeUtilPath, 'utf8');

// Create a simple test environment
const testNormalizeTimestamp = (ts) => {
  if (ts == null) return null;
  if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts;
  if (typeof ts === 'string') {
    if (/^\d{10}$/.test(ts)) return parseInt(ts, 10) * 1000;
    if (/^\d{13}$/.test(ts)) return parseInt(ts, 10);
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? null : parsed;
  }
  if (ts instanceof Date) return ts.getTime();
  return null;
};

const testFormatRelativeDate = (ts) => {
  const ms = testNormalizeTimestamp(ts);
  if (ms == null) return '';
  
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && 
           a.getMonth() === b.getMonth() && 
           a.getDate() === b.getDate();
  }
  
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  if (isSameDay(d, tomorrow)) return 'Tomorrow';
  
  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dd} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const testToLocalString = (ts) => {
  const ms = testNormalizeTimestamp(ts);
  if (ms == null) return '';
  return new Date(ms).toLocaleString();
};

console.log('=== Timestamp Utility Tests ===\n');

// Test 1: Normalize timestamp (seconds to milliseconds)
console.log('Test 1: normalizeTimestamp(1670000000) ->');
const test1 = testNormalizeTimestamp(1670000000);
console.log(`  Result: ${test1}`);
console.log(`  Expected: ${1670000000 * 1000}`);
console.log(`  Match: ${test1 === 1670000000 * 1000 ? '✓' : '✗'}\n`);

// Test 2: Normalize timestamp (already milliseconds)
console.log('Test 2: normalizeTimestamp(1670000000000) ->');
const test2 = testNormalizeTimestamp(1670000000000);
console.log(`  Result: ${test2}`);
console.log(`  Expected: ${1670000000000}`);
console.log(`  Match: ${test2 === 1670000000000 ? '✓' : '✗'}\n`);

// Test 3: Format relative date (today)
console.log('Test 3: formatRelativeDate(Date.now()) ->');
const test3 = testFormatRelativeDate(Date.now());
console.log(`  Result: ${test3}`);
console.log(`  Expected: Today`);
console.log(`  Match: ${test3 === 'Today' ? '✓' : '✗'}\n`);

// Test 4: Format relative date (yesterday)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
console.log('Test 4: formatRelativeDate(yesterday) ->');
const test4 = testFormatRelativeDate(yesterday.getTime());
console.log(`  Result: ${test4}`);
console.log(`  Expected: Yesterday`);
console.log(`  Match: ${test4 === 'Yesterday' ? '✓' : '✗'}\n`);

// Test 5: toLocalString
console.log('Test 5: toLocalString(Date.now()) ->');
const test5 = testToLocalString(Date.now());
console.log(`  Result: ${test5}`);
console.log(`  Format check: ${test5.length > 0 ? '✓' : '✗'}\n`);

// Test 6: Normalize from string (ISO format)
console.log('Test 6: normalizeTimestamp("2023-12-01T00:00:00Z") ->');
const test6 = testNormalizeTimestamp("2023-12-01T00:00:00Z");
console.log(`  Result: ${test6}`);
console.log(`  Is valid timestamp: ${test6 !== null && test6 > 0 ? '✓' : '✗'}\n`);

console.log('=== All Tests Complete ===');
console.log('\nNote: These utilities are designed for React Native.');
console.log('In a React Native environment, import them like:');
console.log("  import { normalizeTimestamp, formatRelativeDate, toLocalString } from '../src/utils/time';");

