/**
 * Unit tests for session-parser.ts
 * Tests utility functions, time parsing, JSON/Markdown parsing
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadSessionParser } from '../helpers/load-session-parser';

let SessionParser: any;

beforeAll(() => {
  // Load the compiled session-parser module
  SessionParser = loadSessionParser();
});

describe('SessionParser - Utility Functions', () => {
  describe('slugify', () => {
    it('should convert text to lowercase slug', () => {
      expect(SessionParser.slugify('Goblet Squat')).toBe('goblet-squat');
      expect(SessionParser.slugify('PUSH-UPS')).toBe('push-ups');
    });

    it('should replace spaces with hyphens', () => {
      expect(SessionParser.slugify('Dumbbell Biceps Curl')).toBe('dumbbell-biceps-curl');
      expect(SessionParser.slugify('Bulgarian Split Squat')).toBe('bulgarian-split-squat');
    });

    it('should remove special characters', () => {
      expect(SessionParser.slugify('90/90 Hip Stretch')).toBe('90-90-hip-stretch');
      expect(SessionParser.slugify('Child\'s Pose')).toBe('child-s-pose');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(SessionParser.slugify('  Plank  ')).toBe('plank');
      expect(SessionParser.slugify('---Test---')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(SessionParser.slugify('')).toBe('');
    });
  });

  describe('parseHMSToSeconds', () => {
    it('should parse plain seconds', () => {
      expect(SessionParser.parseHMSToSeconds('45')).toBe(45);
      expect(SessionParser.parseHMSToSeconds('120')).toBe(120);
      expect(SessionParser.parseHMSToSeconds(60)).toBe(60);
    });

    it('should parse mm:ss format', () => {
      expect(SessionParser.parseHMSToSeconds('02:30')).toBe(150); // 2m 30s
      expect(SessionParser.parseHMSToSeconds('01:00')).toBe(60); // 1 minute
      expect(SessionParser.parseHMSToSeconds('10:45')).toBe(645); // 10m 45s
    });

    it('should parse hh:mm:ss format', () => {
      expect(SessionParser.parseHMSToSeconds('01:30:00')).toBe(5400); // 1h 30m
      expect(SessionParser.parseHMSToSeconds('00:05:30')).toBe(330); // 5m 30s
      expect(SessionParser.parseHMSToSeconds('02:15:45')).toBe(8145); // 2h 15m 45s
    });

    it('should return null for invalid input', () => {
      expect(SessionParser.parseHMSToSeconds('invalid')).toBeNull();
      expect(SessionParser.parseHMSToSeconds('abc:def')).toBeNull();
      expect(SessionParser.parseHMSToSeconds(':')).toBeNull();
    });

    it('should handle null/undefined gracefully', () => {
      expect(SessionParser.parseHMSToSeconds(null)).toBeNull();
      expect(SessionParser.parseHMSToSeconds(undefined)).toBeNull();
      expect(SessionParser.parseHMSToSeconds('')).toBeNull();
    });
  });

  describe('secondsToHHMMSS', () => {
    it('should format seconds to hh:mm:ss', () => {
      expect(SessionParser.secondsToHHMMSS(5400)).toBe('01:30:00'); // 1h 30m
      expect(SessionParser.secondsToHHMMSS(150)).toBe('00:02:30'); // 2m 30s
      expect(SessionParser.secondsToHHMMSS(45)).toBe('00:00:45'); // 45s
    });

    it('should pad single digits with zeros', () => {
      expect(SessionParser.secondsToHHMMSS(5)).toBe('00:00:05');
      expect(SessionParser.secondsToHHMMSS(65)).toBe('00:01:05');
      expect(SessionParser.secondsToHHMMSS(3665)).toBe('01:01:05');
    });

    it('should handle zero seconds', () => {
      expect(SessionParser.secondsToHHMMSS(0)).toBe('00:00:00');
    });

    it('should handle large values', () => {
      expect(SessionParser.secondsToHHMMSS(86400)).toBe('24:00:00'); // 24 hours
      expect(SessionParser.secondsToHHMMSS(90000)).toBe('25:00:00'); // 25 hours
    });

    it('should return empty string for null/undefined', () => {
      expect(SessionParser.secondsToHHMMSS(null)).toBe('');
      expect(SessionParser.secondsToHHMMSS(undefined)).toBe('');
      expect(SessionParser.secondsToHHMMSS(NaN)).toBe('');
    });
  });
});

describe('SessionParser - Markdown Parsing', () => {
  describe('extractExercisesFromMarkdown', () => {
    it('should extract exercise links from markdown', () => {
      const md = `
# Workout
- [Goblet Squat](../exercises/goblet_squat.json) - 3x12
- [Push-ups](../exercises/push_ups.md) - 3x15
`;
      const exercises = SessionParser.extractExercisesFromMarkdown(md);
      expect(exercises).toHaveLength(2);
      expect(exercises[0].title).toBe('Goblet Squat');
      expect(exercises[0].url).toContain('goblet_squat.json');
      expect(exercises[1].title).toBe('Push-ups');
      expect(exercises[1].url).toContain('push_ups.md');
    });

    it('should handle absolute GitHub URLs', () => {
      const md = '[Squat](https://github.com/user/exercAIse/exercises/squat.json)';
      const exercises = SessionParser.extractExercisesFromMarkdown(md);
      expect(exercises).toHaveLength(1);
      expect(exercises[0].title).toBe('Squat');
    });

    it('should return empty array for no matches', () => {
      const md = 'Just some regular text without exercise links';
      const exercises = SessionParser.extractExercisesFromMarkdown(md);
      expect(exercises).toHaveLength(0);
    });
  });

  describe('parseMarkdownPrescriptions', () => {
    it('should parse sets x reps format (3x12)', () => {
      const md = '[Goblet Squat](../exercises/goblet_squat.json) - 3x12 @ 50 lb, RPE 7';
      const prescriptions = SessionParser.parseMarkdownPrescriptions(md);
      const key = 'goblet-squat';
      expect(prescriptions[key]).toBeDefined();
      expect(prescriptions[key]).toHaveLength(3); // 3 sets
      expect(prescriptions[key][0].reps).toBe(12);
      expect(prescriptions[key][0].weight).toBe(50);
      expect(prescriptions[key][0].rpe).toBe(7);
    });

    it('should parse "3 sets of 12" format', () => {
      const md = '[Push-ups](../exercises/push_ups.json) - 3 sets of 15';
      const prescriptions = SessionParser.parseMarkdownPrescriptions(md);
      const key = 'push-ups';
      expect(prescriptions[key]).toBeDefined();
      expect(prescriptions[key]).toHaveLength(3);
      expect(prescriptions[key][0].reps).toBe(15);
    });

    it('should parse weight with units (lb/kg)', () => {
      const md1 = '[Exercise](../exercises/test.json) - 3x10 @ 25 lb';
      const prescriptions1 = SessionParser.parseMarkdownPrescriptions(md1);
      expect(prescriptions1.exercise[0].weight).toBe(25);
      
      const md2 = '[Exercise](../exercises/test.json) - 3x10 @ 12 kg';
      const prescriptions2 = SessionParser.parseMarkdownPrescriptions(md2);
      expect(prescriptions2.exercise[0].weight).toBe(12);
    });

    it('should parse RPE values', () => {
      const md = '[Exercise](../exercises/test.json) - 3x10, RPE 8';
      const prescriptions = SessionParser.parseMarkdownPrescriptions(md);
      expect(prescriptions.exercise[0].rpe).toBe(8);
    });

    it('should detect multiplier hints (per hand, each side)', () => {
      const md1 = '[Curl](../exercises/curl.json) - 3x12 @ 25 lb per hand';
      const prescriptions1 = SessionParser.parseMarkdownPrescriptions(md1);
      expect(prescriptions1.curl[0].multiplier).toBe(2);
      
      const md2 = '[Lunge](../exercises/lunge.json) - 3x10 each';
      const prescriptions2 = SessionParser.parseMarkdownPrescriptions(md2);
      expect(prescriptions2.lunge[0].multiplier).toBe(2);
    });
  });
});

describe('SessionParser - JSON Parsing', () => {
  describe('parseJSONPrescriptions', () => {
    it('should parse SessionPlan JSON with warmup', () => {
      const json = JSON.stringify({
        metadata: { title: 'Test Workout' },
        warmup: [
          { name: 'Arm Circles', logType: 'rpe', rpe: 3 }
        ],
        main: [],
        cooldown: []
      });
      const prescriptions = SessionParser.parseJSONPrescriptions(json);
      expect(prescriptions['arm-circles']).toBeDefined();
      expect(prescriptions['arm-circles'][0].rpe).toBe(3);
    });

    it('should parse strength exercises with sets/reps/weight', () => {
      const json = JSON.stringify({
        metadata: { title: 'Test' },
        warmup: [],
        main: [
          {
            name: '[Goblet Squat](../exercises/goblet_squat.json)',
            logType: 'strength',
            sets: 3,
            reps: 12,
            weight: '50 lb',
            rpe: 7
          }
        ],
        cooldown: []
      });
      const prescriptions = SessionParser.parseJSONPrescriptions(json);
      expect(prescriptions['goblet-squat']).toBeDefined();
      expect(prescriptions['goblet-squat']).toHaveLength(3);
      expect(prescriptions['goblet-squat'][0].reps).toBe(12);
      expect(prescriptions['goblet-squat'][0].weight).toBe(50);
      expect(prescriptions['goblet-squat'][0].rpe).toBe(7);
    });

    it('should parse carry exercises with weight multipliers', () => {
      const json = JSON.stringify({
        metadata: { title: 'Test' },
        warmup: [],
        main: [
          {
            name: 'Farmer Carry',
            logType: 'carry',
            sets: 3,
            weight: '60 lb per hand'
          }
        ],
        cooldown: []
      });
      const prescriptions = SessionParser.parseJSONPrescriptions(json);
      expect(prescriptions['farmer-carry']).toBeDefined();
      expect(prescriptions['farmer-carry']).toHaveLength(3);
      expect(prescriptions['farmer-carry'][0].weight).toBe(60);
      expect(prescriptions['farmer-carry'][0].multiplier).toBe(2); // per hand
    });

    it('should parse exercises and extract names', () => {
      const json = JSON.stringify({
        metadata: { title: 'Run' },
        warmup: [],
        main: [
          {
            name: 'Easy Run',
            rpe: 5
          }
        ],
        cooldown: []
      });
      const prescriptions = SessionParser.parseJSONPrescriptions(json);
      expect(prescriptions['easy-run']).toBeDefined();
      expect(prescriptions['easy-run'][0].rpe).toBe(5);
    });

    it('should parse exercises with sets', () => {
      const json = JSON.stringify({
        metadata: { title: 'Test' },
        warmup: [],
        main: [
          {
            name: 'Plank Hold',
            sets: 3,
            rpe: 7
          }
        ],
        cooldown: []
      });
      const prescriptions = SessionParser.parseJSONPrescriptions(json);
      expect(prescriptions['plank-hold']).toBeDefined();
      expect(prescriptions['plank-hold']).toHaveLength(3);
      expect(prescriptions['plank-hold'][0].rpe).toBe(7);
    });

    it('should handle weight multipliers (per hand, x2)', () => {
      const json1 = JSON.stringify({
        metadata: { title: 'Test' },
        warmup: [],
        main: [{ name: 'Curl', logType: 'strength', sets: 3, reps: 12, weight: '25 lb per hand' }],
        cooldown: []
      });
      const prescriptions1 = SessionParser.parseJSONPrescriptions(json1);
      expect(prescriptions1.curl[0].multiplier).toBe(2);
      
      const json2 = JSON.stringify({
        metadata: { title: 'Test' },
        warmup: [],
        main: [{ name: 'Press', logType: 'strength', sets: 3, reps: 10, weight: '30 x2' }],
        cooldown: []
      });
      const prescriptions2 = SessionParser.parseJSONPrescriptions(json2);
      expect(prescriptions2.press[0].multiplier).toBe(2);
    });

    it('should handle bodyweight exercises (multiplier: 0)', () => {
      const json = JSON.stringify({
        metadata: { title: 'Test' },
        warmup: [],
        main: [{ name: 'Push-up', logType: 'strength', sets: 3, reps: 15, weight: 'bodyweight' }],
        cooldown: []
      });
      const prescriptions = SessionParser.parseJSONPrescriptions(json);
      expect(prescriptions['push-up'][0].multiplier).toBe(0);
    });

    it('should parse rep ranges (8-12 reps)', () => {
      const json = JSON.stringify({
        metadata: { title: 'Test' },
        warmup: [],
        main: [{ name: 'Squat', logType: 'strength', sets: 3, reps: '8-12', weight: '50 lb' }],
        cooldown: []
      });
      const prescriptions = SessionParser.parseJSONPrescriptions(json);
      expect(prescriptions.squat).toBeDefined();
      // Rep ranges are parsed as the first number
      expect(prescriptions.squat[0].reps).toBe(8);
    });
  });
});

describe('SessionParser - Edge Cases', () => {
  it('should handle malformed JSON gracefully', () => {
    const prescriptions = SessionParser.parseJSONPrescriptions('{ invalid json }');
    expect(prescriptions).toEqual({});
  });

  it('should handle empty markdown', () => {
    const prescriptions = SessionParser.parseMarkdownPrescriptions('');
    expect(prescriptions).toEqual({});
  });

  it('should handle missing fields in JSON', () => {
    const json = JSON.stringify({
      metadata: {},
      warmup: [{ name: 'Test', rpe: 5 }],
      main: [],
      cooldown: []
    });
    const prescriptions = SessionParser.parseJSONPrescriptions(json);
    expect(prescriptions.test).toBeDefined();
    expect(prescriptions.test[0].rpe).toBe(5);
  });

  it('should handle Unicode characters in exercise names', () => {
    const slug = SessionParser.slugify('Plié Squat');
    expect(slug).toBe('pli-squat');
  });

  it('should handle extractExercisesFromJSON', () => {
    const json = JSON.stringify({
      metadata: { title: 'Test' },
      warmup: [
        { name: '[Squat](../exercises/squat.json)' }
      ],
      main: [
        { name: 'Push-up' },
        { exercise: 'Pull-up' }
      ],
      cooldown: []
    });
    const exercises = SessionParser.extractExercisesFromJSON(json);
    expect(exercises.length).toBeGreaterThan(0);
    // Should extract unique exercise names
    const titles = exercises.map((e: any) => e.title);
    expect(titles).toContain('Squat');
    expect(titles).toContain('Push-up');
    expect(titles).toContain('Pull-up');
  });
});
