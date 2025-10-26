/**
 * Unit tests for kai-integration.ts
 * Tests SessionPlan validation, normalization, and link checking
 */

import { describe, it, expect, beforeAll } from 'vitest';

let KaiIntegration: any;

beforeAll(() => {
  // Load compiled kai-integration module
  const code = require('fs').readFileSync('dist/assets/kai-integration.js', 'utf8');
  global.window = { ExercAIse: {} } as any;
  eval(code);
  KaiIntegration = (global.window as any).ExercAIse.KaiIntegration;
  
  // Initialize with minimal deps
  KaiIntegration.init({});
});

describe('KaiIntegration - SessionPlan Validation', () => {
  it('should validate correct SessionPlan', () => {
    const validPlan = {
      version: '1.0',
      title: 'Test Workout',
      exercises: [
        { name: 'Goblet Squat', prescribed: { sets: 3, reps: 10 } }
      ]
    };

    const error = KaiIntegration.validateSessionPlan(validPlan);
    expect(error).toBeNull();
  });

  it('should reject null object', () => {
    const error = KaiIntegration.validateSessionPlan(null);
    expect(error).toBe('Not an object');
  });

  it('should reject non-object', () => {
    const error = KaiIntegration.validateSessionPlan('not an object');
    expect(error).toBe('Not an object');
  });

  it('should reject missing version', () => {
    const invalidPlan = {
      title: 'Test',
      exercises: []
    };

    const error = KaiIntegration.validateSessionPlan(invalidPlan);
    expect(error).toBe('version must be "1.0"');
  });

  it('should reject wrong version', () => {
    const invalidPlan = {
      version: '2.0',
      title: 'Test',
      exercises: []
    };

    const error = KaiIntegration.validateSessionPlan(invalidPlan);
    expect(error).toBe('version must be "1.0"');
  });

  it('should reject missing title', () => {
    const invalidPlan = {
      version: '1.0',
      exercises: []
    };

    const error = KaiIntegration.validateSessionPlan(invalidPlan);
    expect(error).toBe('Missing title or exercises');
  });

  it('should reject missing exercises', () => {
    const invalidPlan = {
      version: '1.0',
      title: 'Test'
    };

    const error = KaiIntegration.validateSessionPlan(invalidPlan);
    expect(error).toBe('Missing title or exercises');
  });

  it('should reject exercises as non-array', () => {
    const invalidPlan = {
      version: '1.0',
      title: 'Test',
      exercises: { foo: 'bar' }
    };

    const error = KaiIntegration.validateSessionPlan(invalidPlan);
    expect(error).toBe('exercises must be an array');
  });

  it('should reject exercise without name', () => {
    const invalidPlan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        { prescribed: { sets: 3 } }
      ]
    };

    const error = KaiIntegration.validateSessionPlan(invalidPlan);
    expect(error).toContain('missing name');
  });

  it('should reject invalid prescribed object', () => {
    const invalidPlan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        { name: 'Test', prescribed: 'invalid' }
      ]
    };

    const error = KaiIntegration.validateSessionPlan(invalidPlan);
    expect(error).toContain('.prescribed invalid');
  });

  it('should accept SessionPlan with multiple exercises', () => {
    const validPlan = {
      version: '1.0',
      title: 'Full Workout',
      exercises: [
        { name: 'Exercise 1', prescribed: { sets: 3, reps: 10 } },
        { name: 'Exercise 2', prescribed: { sets: 4, reps: 8 } },
        { name: 'Exercise 3', prescribed: { timeSeconds: 300 } }
      ]
    };

    const error = KaiIntegration.validateSessionPlan(validPlan);
    expect(error).toBeNull();
  });

  it('should accept exercise without prescribed field', () => {
    const validPlan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        { name: 'Mobility Flow' }
      ]
    };

    const error = KaiIntegration.validateSessionPlan(validPlan);
    expect(error).toBeNull();
  });
});

describe('KaiIntegration - Shape Detection', () => {
  it('should recognize valid SessionPlan shape', () => {
    const plan = {
      version: '1.0',
      title: 'Test',
      exercises: []
    };

    expect(KaiIntegration.looksLikeSessionPlan(plan)).toBe(true);
  });

  it('should reject non-SessionPlan shapes', () => {
    expect(KaiIntegration.looksLikeSessionPlan(null)).toBe(false);
    expect(KaiIntegration.looksLikeSessionPlan({})).toBe(false);
    expect(KaiIntegration.looksLikeSessionPlan({ version: '1.0' })).toBe(false);
    expect(KaiIntegration.looksLikeSessionPlan({ exercises: [] })).toBe(false);
    expect(KaiIntegration.looksLikeSessionPlan({ version: '2.0', exercises: [] })).toBe(false);
  });

  it('should recognize workout JSON shape', () => {
    const workout = {
      sections: [
        {
          name: 'Main',
          items: [
            { name: 'Exercise 1' }
          ]
        }
      ]
    };

    expect(KaiIntegration.isWorkoutJSONShape(workout)).toBe(true);
  });

  it('should accept empty sections as workout shape', () => {
    const workout = {
      sections: []
    };

    expect(KaiIntegration.isWorkoutJSONShape(workout)).toBe(true);
  });

  it('should reject non-workout shapes', () => {
    expect(KaiIntegration.isWorkoutJSONShape(null)).toBe(false);
    expect(KaiIntegration.isWorkoutJSONShape({})).toBe(false);
    expect(KaiIntegration.isWorkoutJSONShape({ sections: 'not an array' })).toBe(false);
  });
});

describe('KaiIntegration - SessionPlan Normalization', () => {
  it('should normalize weight specifications', () => {
    const plan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        {
          name: 'DB Bench',
          prescribed: {
            weight: '45 per hand',
            sets: 3,
            reps: 10
          }
        }
      ]
    };

    const normalized = KaiIntegration.normalizeSessionPlanInPlace(plan);
    expect(normalized).toBeDefined();
    expect(normalized.exercises[0].name).toBe('DB Bench');
  });

  it('should handle numeric weight directly', () => {
    const plan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        {
          name: 'Squat',
          prescribed: {
            weight: 135,
            sets: 5,
            reps: 5
          }
        }
      ]
    };

    const normalized = KaiIntegration.normalizeSessionPlanInPlace(plan);
    expect(normalized).toBeDefined();
  });

  it('should handle rep ranges', () => {
    const plan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        {
          name: 'Push-ups',
          prescribed: {
            reps: '8-12',
            sets: 3
          }
        }
      ]
    };

    const normalized = KaiIntegration.normalizeSessionPlanInPlace(plan);
    expect(normalized).toBeDefined();
  });

  it('should handle complex weight strings', () => {
    const plan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        {
          name: 'Carry',
          prescribed: {
            weight: '50 lb x2',
            timeSeconds: 60
          }
        },
        {
          name: 'Press',
          prescribed: {
            weight: '100 total',
            reps: 10
          }
        },
        {
          name: 'Dips',
          prescribed: {
            weight: 'bodyweight',
            reps: 12
          }
        }
      ]
    };

    const normalized = KaiIntegration.normalizeSessionPlanInPlace(plan);
    expect(normalized.exercises.length).toBe(3);
  });

  it('should handle plans without exercises gracefully', () => {
    const plan = {
      version: '1.0',
      title: 'Empty'
    };

    const normalized = KaiIntegration.normalizeSessionPlanInPlace(plan);
    expect(normalized).toBeDefined();
  });

  it('should handle null plan gracefully', () => {
    const normalized = KaiIntegration.normalizeSessionPlanInPlace(null);
    expect(normalized).toBeNull();
  });

  it('should preserve other exercise fields during normalization', () => {
    const plan = {
      version: '1.0',
      title: 'Test',
      exercises: [
        {
          name: 'Squat',
          notes: 'Focus on depth',
          cues: ['Chest up', 'Knees out'],
          prescribed: {
            sets: 3,
            reps: 10,
            weight: 135
          }
        }
      ]
    };

    const normalized = KaiIntegration.normalizeSessionPlanInPlace(plan);
    expect(normalized.exercises[0].notes).toBe('Focus on depth');
    expect(normalized.exercises[0].cues).toEqual(['Chest up', 'Knees out']);
  });
});

describe('KaiIntegration - Edge Cases', () => {
  it('should handle empty exercises array', () => {
    const plan = {
      version: '1.0',
      title: 'Empty Workout',
      exercises: []
    };

    const error = KaiIntegration.validateSessionPlan(plan);
    expect(error).toBeNull();
  });

  it('should handle exercises with only name', () => {
    const plan = {
      version: '1.0',
      title: 'Minimal',
      exercises: [
        { name: 'Warm-up' },
        { name: 'Cooldown' }
      ]
    };

    const error = KaiIntegration.validateSessionPlan(plan);
    expect(error).toBeNull();
  });

  it('should handle mixed exercise types', () => {
    const plan = {
      version: '1.0',
      title: 'Mixed',
      exercises: [
        { name: 'Strength', prescribed: { sets: 4, reps: 8, weight: 100 } },
        { name: 'Endurance', prescribed: { distanceMiles: 2, timeSeconds: 1200 } },
        { name: 'Carry', prescribed: { weight: 50, timeSeconds: 60 } },
        { name: 'Stretch', prescribed: { holdSeconds: 60 } },
        { name: 'Mobility' }
      ]
    };

    const error = KaiIntegration.validateSessionPlan(plan);
    expect(error).toBeNull();
  });
});
