#!/usr/bin/env node
/**
 * Rep Range Normalization (REPRANGE-01)
 * 
 * Normalizes exercise reps into structured fields for downstream progression logic.
 * Accepts integer or string range "x-y" and outputs reps_low, reps_high, reps_display.
 */

/**
 * Normalize reps input into structured format
 * @param {number|string} reps - Raw reps input (integer or "x-y" range)
 * @returns {Object} - { reps_low, reps_high, reps_display, isRange }
 */
function normalizeReps(reps) {
  // Handle null/undefined
  if (reps == null) {
    return {
      reps_low: null,
      reps_high: null,
      reps_display: null,
      isRange: false
    };
  }

  // Store original for display
  const reps_display = String(reps);

  // Handle numeric input
  if (typeof reps === 'number' && !isNaN(reps)) {
    const intReps = Math.max(1, Math.floor(reps));
    return {
      reps_low: intReps,
      reps_high: intReps,
      reps_display: reps_display,
      isRange: false
    };
  }

  // Handle string input
  if (typeof reps === 'string') {
    const trimmed = reps.trim();
    
    // Check for range pattern (supports both - and – characters)
    const rangeMatch = trimmed.match(/^(\d+)\s*[–-]\s*(\d+)$/);
    
    if (rangeMatch) {
      let low = parseInt(rangeMatch[1], 10);
      let high = parseInt(rangeMatch[2], 10);
      
      // Ensure both are valid numbers
      if (isNaN(low) || isNaN(high)) {
        return {
          reps_low: null,
          reps_high: null,
          reps_display: reps_display,
          isRange: false,
          error: 'Invalid range numbers'
        };
      }
      
      // Swap if bounds are reversed (e.g., "12-8")
      if (low > high) {
        [low, high] = [high, low];
      }
      
      // Ensure minimum of 1
      low = Math.max(1, low);
      high = Math.max(1, high);
      
      return {
        reps_low: low,
        reps_high: high,
        reps_display: reps_display,
        isRange: low !== high
      };
    }
    
    // Try to parse as single number
    const singleMatch = trimmed.match(/^(\d+)$/);
    if (singleMatch) {
      const intReps = Math.max(1, parseInt(singleMatch[1], 10));
      return {
        reps_low: intReps,
        reps_high: intReps,
        reps_display: reps_display,
        isRange: false
      };
    }
    
    // Handle malformed string
    return {
      reps_low: null,
      reps_high: null,
      reps_display: reps_display,
      isRange: false,
      error: 'Malformed reps string'
    };
  }

  // Unsupported type
  return {
    reps_low: null,
    reps_high: null,
    reps_display: reps_display,
    isRange: false,
    error: 'Unsupported reps type'
  };
}

/**
 * Normalize exercise prescription in place
 * @param {Object} prescription - Exercise prescription object
 * @returns {Object} - Modified prescription with normalized reps
 */
function normalizePrescriptionReps(prescription) {
  if (!prescription || typeof prescription !== 'object') {
    return prescription;
  }

  if (prescription.reps !== undefined) {
    const normalized = normalizeReps(prescription.reps);
    
    // Add normalized fields
    prescription.reps_low = normalized.reps_low;
    prescription.reps_high = normalized.reps_high;
    prescription.reps_display = normalized.reps_display;
    
    // Keep original reps for backwards compatibility during transition
    // prescription.reps = prescription.reps; // unchanged
    
    if (normalized.error) {
      prescription.reps_error = normalized.error;
    }
  }

  return prescription;
}

/**
 * Normalize all exercises in a session plan
 * @param {Object} sessionPlan - Session plan with exercises array
 * @returns {Object} - Modified session plan with normalized reps
 */
function normalizeSessionPlanReps(sessionPlan) {
  if (!sessionPlan || !Array.isArray(sessionPlan.exercises)) {
    return sessionPlan;
  }

  sessionPlan.exercises.forEach(exercise => {
    if (exercise.prescribed) {
      normalizePrescriptionReps(exercise.prescribed);
    }
    if (exercise.prescription) {
      normalizePrescriptionReps(exercise.prescription);
    }
  });

  return sessionPlan;
}

module.exports = {
  normalizeReps,
  normalizePrescriptionReps,
  normalizeSessionPlanReps
};

// CLI usage
if (require.main === module) {
  const testCases = [
    8,
    "8",
    "8-12",
    "12-8", // reversed
    "5–10", // em dash
    "6-6",  // equal bounds
    "0-5",  // zero handling
    "-3-7", // negative handling
    "abc",  // malformed
    "8-",   // incomplete
    null,
    undefined
  ];

  console.log('Rep Range Normalization Test Cases:');
  console.log('==================================');
  
  testCases.forEach(input => {
    const result = normalizeReps(input);
    console.log(`Input: ${JSON.stringify(input)} -> ${JSON.stringify(result)}`);
  });
}