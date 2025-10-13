#!/usr/bin/env node
/**
 * Test Suite for Rep Range Normalization (REPRANGE-01)
 * 
 * Tests acceptance criteria:
 * 1. Accept reps as integer or string range "x-y"
 * 2. Normalize to: reps_low, reps_high, and reps_display (original) per exercise
 * 3. If malformed (e.g., "12-8"), swap bounds; if equal, treat as fixed reps
 * 4. Downstream modules use reps_high for progression thresholds
 */

const path = require('path');
const { normalizeReps, normalizePrescriptionReps, normalizeSessionPlanReps } = require('../scripts/rep_range_normalizer');

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
  }

  assertNotNull(value, message = '') {
    if (value === null || value === undefined) {
      throw new Error(`${message}\nExpected non-null value, got: ${value}`);
    }
  }

  assertTrue(condition, message = '') {
    if (!condition) {
      throw new Error(`${message}\nExpected true, got: ${condition}`);
    }
  }

  run() {
    console.log(`Running ${this.tests.length} tests...\n`);

    this.tests.forEach(({ name, fn }) => {
      try {
        fn.call(this);
        console.log(`✓ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  ${error.message}`);
        this.failed++;
      }
    });

    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Test suite
const runner = new TestRunner();

// Test 1: Basic integer input
runner.test('normalizes integer reps correctly', function() {
  const result = normalizeReps(8);
  this.assertEqual(result, {
    reps_low: 8,
    reps_high: 8,
    reps_display: '8',
    isRange: false
  });
});

// Test 2: String integer input
runner.test('normalizes string integer reps correctly', function() {
  const result = normalizeReps('10');
  this.assertEqual(result, {
    reps_low: 10,
    reps_high: 10,
    reps_display: '10',
    isRange: false
  });
});

// Test 3: Normal range with hyphen
runner.test('normalizes hyphen range correctly', function() {
  const result = normalizeReps('8-12');
  this.assertEqual(result, {
    reps_low: 8,
    reps_high: 12,
    reps_display: '8-12',
    isRange: true
  });
});

// Test 4: Normal range with em dash
runner.test('normalizes em dash range correctly', function() {
  const result = normalizeReps('5–10');
  this.assertEqual(result, {
    reps_low: 5,
    reps_high: 10,
    reps_display: '5–10',
    isRange: true
  });
});

// Test 5: Reversed bounds (key requirement)
runner.test('swaps reversed bounds correctly', function() {
  const result = normalizeReps('12-8');
  this.assertEqual(result, {
    reps_low: 8,
    reps_high: 12,
    reps_display: '12-8',
    isRange: true
  });
});

// Test 6: Equal bounds
runner.test('treats equal bounds as fixed reps', function() {
  const result = normalizeReps('6-6');
  this.assertEqual(result, {
    reps_low: 6,
    reps_high: 6,
    reps_display: '6-6',
    isRange: false
  });
});

// Test 7: Zero handling
runner.test('handles zero by setting minimum to 1', function() {
  const result = normalizeReps('0-5');
  this.assertEqual(result, {
    reps_low: 1,
    reps_high: 5,
    reps_display: '0-5',
    isRange: true
  });
});

// Test 8: Negative handling
runner.test('handles negative numbers by setting minimum to 1', function() {
  const result = normalizeReps(0);
  this.assertEqual(result, {
    reps_low: 1,
    reps_high: 1,
    reps_display: '0',
    isRange: false
  });
});

// Test 9: Null/undefined input
runner.test('handles null input gracefully', function() {
  const result = normalizeReps(null);
  this.assertEqual(result, {
    reps_low: null,
    reps_high: null,
    reps_display: null,
    isRange: false
  });
});

runner.test('handles undefined input gracefully', function() {
  const result = normalizeReps(undefined);
  this.assertEqual(result, {
    reps_low: null,
    reps_high: null,
    reps_display: null,
    isRange: false
  });
});

// Test 10: Malformed strings
runner.test('handles malformed strings with error', function() {
  const result = normalizeReps('abc');
  this.assertEqual(result.error, 'Malformed reps string');
  this.assertEqual(result.reps_low, null);
  this.assertEqual(result.reps_high, null);
  this.assertEqual(result.reps_display, 'abc');
});

runner.test('handles incomplete range with error', function() {
  const result = normalizeReps('8-');
  this.assertEqual(result.error, 'Malformed reps string');
  this.assertEqual(result.reps_display, '8-');
});

// Test 11: Whitespace handling
runner.test('handles whitespace in ranges', function() {
  const result = normalizeReps(' 8 - 12 ');
  this.assertEqual(result, {
    reps_low: 8,
    reps_high: 12,
    reps_display: ' 8 - 12 ',
    isRange: true
  });
});

// Test 12: Prescription normalization
runner.test('normalizes prescription object in place', function() {
  const prescription = {
    sets: 3,
    reps: '8-12',
    rpe: 7,
    weight: 25
  };

  const result = normalizePrescriptionReps(prescription);
  
  // Should modify in place
  this.assertTrue(result === prescription);
  
  // Should have normalized fields
  this.assertEqual(prescription.reps_low, 8);
  this.assertEqual(prescription.reps_high, 12);
  this.assertEqual(prescription.reps_display, '8-12');
  
  // Should preserve original
  this.assertEqual(prescription.reps, '8-12');
  this.assertEqual(prescription.sets, 3);
  this.assertEqual(prescription.rpe, 7);
});

// Test 13: Session plan normalization
runner.test('normalizes session plan exercises', function() {
  const sessionPlan = {
    version: '1.0',
    title: 'Test Session',
    exercises: [
      {
        slug: 'goblet_squat',
        name: 'Goblet Squat',
        prescribed: { sets: 3, reps: '8-12', rpe: 7 }
      },
      {
        slug: 'push_ups',
        name: 'Push-ups',
        prescription: { sets: 2, reps: 15, weight: null }
      }
    ]
  };

  const result = normalizeSessionPlanReps(sessionPlan);
  
  // Should modify in place
  this.assertTrue(result === sessionPlan);
  
  // Check first exercise (prescribed field)
  const ex1 = sessionPlan.exercises[0];
  this.assertEqual(ex1.prescribed.reps_low, 8);
  this.assertEqual(ex1.prescribed.reps_high, 12);
  this.assertEqual(ex1.prescribed.reps_display, '8-12');
  
  // Check second exercise (prescription field)
  const ex2 = sessionPlan.exercises[1];
  this.assertEqual(ex2.prescription.reps_low, 15);
  this.assertEqual(ex2.prescription.reps_high, 15);
  this.assertEqual(ex2.prescription.reps_display, '15');
});

// Test 14: Error handling for malformed prescription
runner.test('handles prescription with malformed reps', function() {
  const prescription = {
    sets: 3,
    reps: 'invalid-range',
    rpe: 7
  };

  normalizePrescriptionReps(prescription);
  
  this.assertEqual(prescription.reps_low, null);
  this.assertEqual(prescription.reps_high, null);
  this.assertEqual(prescription.reps_display, 'invalid-range');
  this.assertNotNull(prescription.reps_error);
});

// Test 15: Downstream progression threshold usage
runner.test('provides reps_high for progression thresholds', function() {
  const cases = [
    { input: 8, expected: 8 },
    { input: '8-12', expected: 12 },
    { input: '12-8', expected: 12 }, // reversed
    { input: '10-10', expected: 10 }  // equal
  ];

  cases.forEach(({ input, expected }) => {
    const result = normalizeReps(input);
    this.assertEqual(result.reps_high, expected, `For input ${input}`);
  });
});

// Test 16: Edge cases
runner.test('handles various edge cases', function() {
  const edgeCases = [
    { input: 0.5, expectedLow: 1, expectedHigh: 1 },
    { input: -5, expectedLow: 1, expectedHigh: 1 },
    { input: '1-100', expectedLow: 1, expectedHigh: 100 },
    { input: [], expectedLow: null, expectedHigh: null },
    { input: {}, expectedLow: null, expectedHigh: null }
  ];

  edgeCases.forEach(({ input, expectedLow, expectedHigh }) => {
    const result = normalizeReps(input);
    this.assertEqual(result.reps_low, expectedLow, `Low for input ${JSON.stringify(input)}`);
    this.assertEqual(result.reps_high, expectedHigh, `High for input ${JSON.stringify(input)}`);
  });
});

// Run the tests
if (require.main === module) {
  const success = runner.run();
  process.exit(success ? 0 : 1);
}

module.exports = { TestRunner, runRepRangeTests: () => runner.run() };