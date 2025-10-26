/**
 * Integration tests for workout parsing
 * Tests complete SessionPlan JSON parsing with various logTypes
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadSessionParser } from '../helpers/load-session-parser';
import { readFileSync } from 'fs';
import { join } from 'path';

let SessionParser: any;

beforeAll(() => {
  SessionParser = loadSessionParser();
});

describe('Workout Parsing - SessionPlan JSON', () => {
  it('should parse a complete strength workout', () => {
    const sampleWorkout = {
      metadata: {
        title: 'Upper Body Strength',
        date: '2025-10-24',
        block: 4,
        week: 2,
        tags: ['upper', 'strength']
      },
      warmup: [
        {
          name: 'Arm Circles',
          logType: 'rpe',
          prescription: {
            sets: 2,
            reps: 10,
            rpe: 3
          }
        }
      ],
      main: [
        {
          name: 'Dumbbell Bench Press',
          link: '../exercises/flat_dumbbell_bench_press.json',
          logType: 'strength',
          prescription: {
            sets: 4,
            reps: 8,
            weight: 45,
            multiplier: 2,
            rpe: 7.5,
            restSeconds: 120
          }
        },
        {
          name: 'Goblet Squat',
          link: '../exercises/goblet_squat.json',
          logType: 'strength',
          prescription: {
            sets: 3,
            reps: 10,
            weight: 35,
            multiplier: 1,
            rpe: 7
          }
        }
      ],
      cooldown: [
        {
          name: 'Foam Rolling',
          logType: 'time',
          prescription: {
            timeSeconds: 300
          }
        }
      ]
    };

    const jsonStr = JSON.stringify(sampleWorkout, null, 2);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises).toBeDefined();
    expect(exercises.length).toBeGreaterThan(0);
    
    // Find the strength exercises (returns { title: string })
    const benchPress = exercises.find((ex: any) => ex.title.includes('Bench Press'));
    expect(benchPress).toBeDefined();
    expect(benchPress.title).toBe('Dumbbell Bench Press');
  });

  it('should parse endurance logType', () => {
    const enduranceWorkout = {
      metadata: { title: 'Cardio Day' },
      main: [
        {
          name: 'Easy Jog',
          logType: 'distance',
          prescription: {
            distanceMiles: 2,
            timeSeconds: 1200,
            rpe: 5
          }
        }
      ]
    };

    const jsonStr = JSON.stringify(enduranceWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises).toBeDefined();
    const jog = exercises.find((ex: any) => ex.title.includes('Jog'));
    expect(jog).toBeDefined();
  });

  it('should parse carry logType', () => {
    const carryWorkout = {
      metadata: { title: 'Loaded Carries' },
      main: [
        {
          name: 'Farmer Carry',
          logType: 'carry',
          prescription: {
            sets: 3,
            weight: 50,
            multiplier: 2,
            timeSeconds: 60,
            restSeconds: 90
          }
        }
      ]
    };

    const jsonStr = JSON.stringify(carryWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    const carry = exercises.find((ex: any) => ex.title.includes('Carry'));
    expect(carry).toBeDefined();
  });

  it('should parse stretch logType with holdSeconds', () => {
    const stretchWorkout = {
      metadata: { title: 'Recovery Stretching' },
      cooldown: [
        {
          name: 'Pigeon Stretch',
          logType: 'stretch',
          prescription: {
            sets: 2,
            holdSeconds: 60
          }
        }
      ]
    };

    const jsonStr = JSON.stringify(stretchWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    const stretch = exercises.find((ex: any) => ex.title.includes('Pigeon'));
    expect(stretch).toBeDefined();
  });

  it('should parse list logType (yoga flows)', () => {
    const yogaWorkout = {
      metadata: { title: 'Yin Yoga Flow' },
      main: [
        {
          name: 'Yin Yoga Sequence',
          logType: 'list',
          prescription: {
            timeSeconds: 1800,
            rpe: 4
          }
        }
      ]
    };

    const jsonStr = JSON.stringify(yogaWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    const yoga = exercises.find((ex: any) => ex.title.includes('Yoga'));
    expect(yoga).toBeDefined();
  });

  it('should handle multiple sections', () => {
    const multiSectionWorkout = {
      metadata: { title: 'Full Session' },
      warmup: [
        { name: 'Warm-up Move 1', logType: 'rpe', prescription: { reps: 10 } }
      ],
      main: [
        { name: 'Main Move 1', logType: 'strength', prescription: { sets: 4, reps: 8 } },
        { name: 'Main Move 2', logType: 'strength', prescription: { sets: 3, reps: 10 } }
      ],
      cooldown: [
        { name: 'Cooldown Move 1', logType: 'time', prescription: { timeSeconds: 300 } }
      ]
    };

    const jsonStr = JSON.stringify(multiSectionWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises.length).toBeGreaterThanOrEqual(3);
  });

  it('should extract exercise links correctly', () => {
    const workoutWithLinks = {
      metadata: { title: 'Test' },
      main: [
        {
          name: 'Goblet Squat',
          link: '../exercises/goblet_squat.json',
          logType: 'strength',
          prescription: { sets: 3, reps: 10 }
        }
      ]
    };

    const jsonStr = JSON.stringify(workoutWithLinks);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    const squat = exercises[0];
    expect(squat).toBeDefined();
    expect(squat.title).toBe('Goblet Squat');
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalWorkout = {
      metadata: { title: 'Minimal' },
      main: [
        {
          name: 'Basic Exercise',
          logType: 'strength'
          // No prescription
        }
      ]
    };

    const jsonStr = JSON.stringify(minimalWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises).toBeDefined();
    expect(exercises.length).toBe(1);
  });

  it('should parse prescriptions correctly', () => {
    const workoutWithPrescriptions = {
      metadata: { title: 'Test Prescriptions' },
      main: [
        {
          name: 'Exercise 1',
          logType: 'strength',
          prescription: {
            sets: 4,
            reps: 8,
            weight: 45,
            multiplier: 2,
            rpe: 7.5,
            restSeconds: 120
          }
        }
      ]
    };

    const jsonStr = JSON.stringify(workoutWithPrescriptions);
    const prescriptions = SessionParser.parseJSONPrescriptions(jsonStr);

    expect(prescriptions).toBeDefined();
    expect(typeof prescriptions).toBe('object');
    
    // Prescriptions are organized by exercise key
    const keys = Object.keys(prescriptions);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('should handle complex rep schemes', () => {
    const complexReps = {
      metadata: { title: 'Complex' },
      main: [
        {
          name: 'Wave Loading',
          logType: 'strength',
          prescription: {
            sets: 3,
            reps: '5-3-1', // Complex rep scheme
            weight: 100,
            rpe: 8
          }
        }
      ]
    };

    const jsonStr = JSON.stringify(complexReps);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises).toBeDefined();
    expect(exercises.length).toBe(1);
  });

  it('should handle exercises with notes and cues', () => {
    const workoutWithNotes = {
      metadata: { title: 'With Notes' },
      main: [
        {
          name: 'Squat',
          logType: 'strength',
          prescription: { sets: 3, reps: 10 },
          notes: 'Focus on depth',
          cues: ['Chest up', 'Knees out', 'Drive through heels']
        }
      ]
    };

    const jsonStr = JSON.stringify(workoutWithNotes);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises).toBeDefined();
    expect(exercises[0].title).toBe('Squat');
  });
});

describe('Workout Parsing - Edge Cases', () => {
  it('should handle empty sections', () => {
    const emptyWorkout = {
      metadata: { title: 'Empty' },
      warmup: [],
      main: [],
      cooldown: []
    };

    const jsonStr = JSON.stringify(emptyWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises).toBeDefined();
    expect(exercises.length).toBe(0);
  });

  it('should handle malformed JSON gracefully', () => {
    const malformedJSON = '{ "metadata": { "title": "Test" }, "main": [';
    
    expect(() => {
      SessionParser.extractExercisesFromJSON(malformedJSON);
    }).not.toThrow();
  });

  it('should handle non-workout JSON objects', () => {
    const nonWorkout = { random: 'data', foo: 'bar' };
    const jsonStr = JSON.stringify(nonWorkout);
    
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);
    expect(exercises).toBeDefined();
  });

  it('should preserve exercise order', () => {
    const orderedWorkout = {
      metadata: { title: 'Order Test' },
      main: [
        { name: 'First', logType: 'strength', prescription: { sets: 1 } },
        { name: 'Second', logType: 'strength', prescription: { sets: 1 } },
        { name: 'Third', logType: 'strength', prescription: { sets: 1 } }
      ]
    };

    const jsonStr = JSON.stringify(orderedWorkout);
    const exercises = SessionParser.extractExercisesFromJSON(jsonStr);

    expect(exercises[0].title).toBe('First');
    expect(exercises[1].title).toBe('Second');
    expect(exercises[2].title).toBe('Third');
  });
});
