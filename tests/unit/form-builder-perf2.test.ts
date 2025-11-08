/**
 * Unit tests for form-builder.ts perf-2 nested structure functions
 * Tests collectNestedData, round grouping, exercise index, and validation
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let FormBuilder: any;
let sandbox: any;

/**
 * Load compiled form-builder.js and create a mock DOM environment
 */
function loadFormBuilder() {
  const distPath = path.resolve(__dirname, '../../dist/assets/form-builder.js');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      'form-builder.js not found in dist/assets/. Run "npm run build" first.'
    );
  }

  const code = fs.readFileSync(distPath, 'utf-8');

  // Create a sandbox with window and document mocks
  const mockDocument = {
    getElementById: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(() => ({
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() }
    }))
  };

  const mockWindow = {
    ExercAIse: {
      FormBuilder: undefined
    },
    document: mockDocument,
    console: console
  };

  const sandboxContext: any = {
    window: mockWindow,
    document: mockDocument,
    console: console
  };

  // Execute the code in the sandbox
  vm.createContext(sandboxContext);
  vm.runInContext(code, sandboxContext);

  if (!sandboxContext.window?.ExercAIse?.FormBuilder) {
    throw new Error('Failed to load FormBuilder from compiled module');
  }

  return { FormBuilder: sandboxContext.window.ExercAIse.FormBuilder, sandbox: sandboxContext };
}

beforeAll(() => {
  const result = loadFormBuilder();
  FormBuilder = result.FormBuilder;
  sandbox = result.sandbox;
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

describe('FormBuilder - Perf-2 Nested Structure', () => {
  describe('exerciseKeyFromName', () => {
    it('should convert exercise name to lowercase key', () => {
      expect(FormBuilder.exerciseKeyFromName('Goblet Squat')).toBe('goblet squat');
      expect(FormBuilder.exerciseKeyFromName('PUSH-UPS')).toBe('push-ups');
      expect(FormBuilder.exerciseKeyFromName('Bulgarian Split Squat')).toBe('bulgarian split squat');
    });

    it('should preserve special characters', () => {
      expect(FormBuilder.exerciseKeyFromName('90/90 Hip Stretch')).toBe('90/90 hip stretch');
      expect(FormBuilder.exerciseKeyFromName("Child's Pose")).toBe("child's pose");
    });

    it('should trim whitespace', () => {
      expect(FormBuilder.exerciseKeyFromName('  Plank  ')).toBe('plank');
      expect(FormBuilder.exerciseKeyFromName('Dumbbell\nRow')).toBe('dumbbell row');
    });
  });

  describe('buildExerciseIndex', () => {
    it('should build index for standalone exercises', () => {
      const sections = [
        {
          sectionType: 'warmup',
          items: [
            {
              itemKind: 'exercise',
              name: 'Bodyweight Squat',
              sets: [
                { weight: null, reps: 10, rpe: null },
                { weight: null, reps: 10, rpe: null }
              ]
            }
          ]
        }
      ];

      const index = FormBuilder.buildExerciseIndex(sections);

      expect(index).toHaveProperty('bodyweight squat');
      expect(index['bodyweight squat']).toMatchObject({
        name: 'Bodyweight Squat',
        totalSets: 2,
        totalReps: 20,
        totalVolume: 0,
        avgRPE: null,
        locations: [
          { section: 'warmup', itemIndex: 0 }
        ]
      });
    });

    it('should calculate volume for weighted exercises', () => {
      const sections = [
        {
          sectionType: 'main',
          items: [
            {
              itemKind: 'exercise',
              name: 'Goblet Squat',
              sets: [
                { weight: 50, reps: 8, rpe: 7 },
                { weight: 50, reps: 8, rpe: 8 },
                { weight: 50, reps: 7, rpe: 8 }
              ]
            }
          ]
        }
      ];

      const index = FormBuilder.buildExerciseIndex(sections);

      expect(index['goblet squat']).toMatchObject({
        name: 'Goblet Squat',
        totalSets: 3,
        totalReps: 23,
        totalVolume: 1150, // 50 * (8 + 8 + 7)
        avgRPE: 7.67
      });
    });

    it('should handle exercises in supersets with rounds', () => {
      const sections = [
        {
          sectionType: 'main',
          items: [
            {
              itemKind: 'superset',
              name: 'Upper Push/Pull',
              rounds: [
                {
                  roundNumber: 1,
                  exercises: [
                    { name: 'Push-ups', weight: null, reps: 12, rpe: 6 },
                    { name: 'Dumbbell Row', weight: 45, reps: 10, rpe: 7 }
                  ]
                },
                {
                  roundNumber: 2,
                  exercises: [
                    { name: 'Push-ups', weight: null, reps: 11, rpe: 7 },
                    { name: 'Dumbbell Row', weight: 45, reps: 10, rpe: 7 }
                  ]
                }
              ]
            }
          ]
        }
      ];

      const index = FormBuilder.buildExerciseIndex(sections);

      expect(index['push-ups']).toMatchObject({
        name: 'Push-ups',
        totalSets: 2,
        totalReps: 23,
        totalVolume: 0,
        avgRPE: 6.5,
        locations: [
          { section: 'main', itemIndex: 0, exerciseIndex: 0 }
        ]
      });

      expect(index['dumbbell row']).toMatchObject({
        name: 'Dumbbell Row',
        totalSets: 2,
        totalReps: 20,
        totalVolume: 900, // 45 * 20
        avgRPE: 7
      });
    });

    it('should aggregate exercises appearing in multiple sections', () => {
      const sections = [
        {
          sectionType: 'warmup',
          items: [
            {
              itemKind: 'exercise',
              name: 'Plank',
              sets: [{ weight: null, reps: null, rpe: 5 }]
            }
          ]
        },
        {
          sectionType: 'main',
          items: [
            {
              itemKind: 'exercise',
              name: 'Plank',
              sets: [
                { weight: null, reps: null, rpe: 7 },
                { weight: null, reps: null, rpe: 8 }
              ]
            }
          ]
        }
      ];

      const index = FormBuilder.buildExerciseIndex(sections);

      expect(index['plank']).toMatchObject({
        name: 'Plank',
        totalSets: 3,
        totalReps: 0,
        totalVolume: 0,
        avgRPE: 6.67,
        locations: [
          { section: 'warmup', itemIndex: 0 },
          { section: 'main', itemIndex: 0 }
        ]
      });
    });

    it('should handle empty sections', () => {
      const sections: any[] = [];
      const index = FormBuilder.buildExerciseIndex(sections);
      expect(index).toEqual({});
    });

    it('should skip null/undefined sets and exercises', () => {
      const sections = [
        {
          sectionType: 'main',
          items: [
            {
              itemKind: 'exercise',
              name: 'Test Exercise',
              sets: [
                { weight: 50, reps: 10, rpe: 7 },
                null, // Should skip
                { weight: 50, reps: 10, rpe: 7 }
              ]
            },
            {
              itemKind: 'superset',
              rounds: [
                {
                  roundNumber: 1,
                  exercises: [
                    null, // Should skip
                    { name: 'Valid Exercise', weight: 30, reps: 12, rpe: 6 }
                  ]
                }
              ]
            }
          ]
        }
      ];

      const index = FormBuilder.buildExerciseIndex(sections);

      expect(index['test exercise'].totalSets).toBe(2);
      expect(index['valid exercise'].totalSets).toBe(1);
    });
  });

  describe('collectRoundsForSuperset', () => {
    beforeEach(() => {
      // Mock DOM methods for form data collection
      sandbox.document.querySelectorAll = vi.fn((selector: string) => {
        if (selector.includes('round-number')) {
          return [
            { value: '1' },
            { value: '2' },
            { value: '3' }
          ];
        }
        return [];
      });
    });

    it('should collect rounds for superset with exercise data', () => {
      const children = [
        { name: 'Push-ups', link: 'exercises/push_ups.json' },
        { name: 'Dumbbell Row', link: 'exercises/dumbbell_row.json' }
      ];

      // Mock getSetDataForExercise to return test data
      const originalGetSetData = FormBuilder.getSetDataForExercise;
      FormBuilder.getSetDataForExercise = vi.fn((exKey: string, setNum: number) => {
        if (exKey === 'push-ups') {
          return { weight: null, reps: [12, 11, 10][setNum - 1], rpe: 7 };
        }
        if (exKey === 'dumbbell row') {
          return { weight: 45, reps: [10, 10, 9][setNum - 1], rpe: 7 };
        }
        return null;
      });

      const rounds = FormBuilder.collectRoundsForSuperset(children, 60);

      expect(rounds).toHaveLength(3);
      expect(rounds[0]).toMatchObject({
        roundNumber: 1,
        exercises: [
          { name: 'Push-ups', weight: null, reps: 12, rpe: 7, link: 'exercises/push_ups.json' },
          { name: 'Dumbbell Row', weight: 45, reps: 10, rpe: 7, link: 'exercises/dumbbell_row.json' }
        ],
        restAfterRound: 60
      });

      // Restore original function
      FormBuilder.getSetDataForExercise = originalGetSetData;
    });

    it('should skip rounds with no valid exercises', () => {
      const children = [
        { name: 'Exercise A' }
      ];

      // Mock to return null (incomplete data)
      const originalGetSetData = FormBuilder.getSetDataForExercise;
      FormBuilder.getSetDataForExercise = vi.fn(() => null);

      const rounds = FormBuilder.collectRoundsForSuperset(children, 45);

      expect(rounds).toEqual([]);

      FormBuilder.getSetDataForExercise = originalGetSetData;
    });

    it('should handle missing prescribedRest', () => {
      const children = [{ name: 'Exercise A' }];

      const originalGetSetData = FormBuilder.getSetDataForExercise;
      FormBuilder.getSetDataForExercise = vi.fn(() => ({ weight: 50, reps: 10, rpe: 7 }));

      const rounds = FormBuilder.collectRoundsForSuperset(children, undefined);

      expect(rounds[0].restAfterRound).toBeNull();

      FormBuilder.getSetDataForExercise = originalGetSetData;
    });
  });

  describe('validatePerformanceV2', () => {
    it('should validate correct perf-2 structure', () => {
      const validData = {
        version: 'perf-2',
        timestamp: new Date().toISOString(),
        duration: 3600,
        metadata: {
          title: 'Test Workout',
          date: '2025-05-01',
          block: 5,
          week: 1,
          tags: ['strength']
        },
        sections: [
          {
            sectionType: 'main',
            items: [
              {
                itemKind: 'exercise',
                name: 'Goblet Squat',
                sets: [
                  { weight: 50, reps: 8, rpe: 7 }
                ]
              }
            ]
          }
        ],
        exerciseIndex: {
          'goblet squat': {
            name: 'Goblet Squat',
            totalSets: 1,
            totalReps: 8,
            totalVolume: 400,
            avgRPE: 7,
            locations: [{ section: 'main', itemIndex: 0 }]
          }
        }
      };

      const result = FormBuilder.validatePerformanceV2(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        version: 'perf-2',
        // Missing timestamp, duration, metadata, sections
        exerciseIndex: {}
      };

      const result = FormBuilder.validatePerformanceV2(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes('timestamp'))).toBe(true);
    });

    it('should validate section structure', () => {
      const invalidSections = {
        version: 'perf-2',
        timestamp: new Date().toISOString(),
        duration: 3600,
        metadata: { title: 'Test', date: '2025-05-01', block: 5, week: 1, tags: [] },
        sections: [
          {
            sectionType: 'main',
            items: [
              {
                itemKind: 'exercise',
                // Missing name
                sets: []
              }
            ]
          }
        ],
        exerciseIndex: {}
      };

      const result = FormBuilder.validatePerformanceV2(invalidSections);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('name'))).toBe(true);
    });

    it('should validate round numbering is sequential', () => {
      const invalidRounds = {
        version: 'perf-2',
        timestamp: new Date().toISOString(),
        duration: 3600,
        metadata: { title: 'Test', date: '2025-05-01', block: 5, week: 1, tags: [] },
        sections: [
          {
            sectionType: 'main',
            items: [
              {
                itemKind: 'superset',
                name: 'Test Superset',
                rounds: [
                  { roundNumber: 1, exercises: [{ name: 'Ex A', weight: 50, reps: 10 }], restAfterRound: 60 },
                  { roundNumber: 3, exercises: [{ name: 'Ex A', weight: 50, reps: 10 }], restAfterRound: 60 }
                  // Round 2 is missing!
                ]
              }
            ]
          }
        ],
        exerciseIndex: {}
      };

      const result = FormBuilder.validatePerformanceV2(invalidRounds);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('sequential'))).toBe(true);
    });

    it('should validate exercise keys in index match content', () => {
      const mismatchedKeys = {
        version: 'perf-2',
        timestamp: new Date().toISOString(),
        duration: 3600,
        metadata: { title: 'Test', date: '2025-05-01', block: 5, week: 1, tags: [] },
        sections: [
          {
            sectionType: 'main',
            items: [
              {
                itemKind: 'exercise',
                name: 'Goblet Squat',
                sets: [{ weight: 50, reps: 8, rpe: 7 }]
              }
            ]
          }
        ],
        exerciseIndex: {
          'wrong key': {
            name: 'Wrong Exercise',
            totalSets: 1,
            totalReps: 8,
            totalVolume: 400,
            avgRPE: 7,
            locations: [{ section: 'main', itemIndex: 0 }]
          }
        }
      };

      const result = FormBuilder.validatePerformanceV2(mismatchedKeys);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('exerciseIndex'))).toBe(true);
    });

    it('should accept valid superset with rounds', () => {
      const validSuperset = {
        version: 'perf-2',
        timestamp: new Date().toISOString(),
        duration: 3600,
        metadata: { title: 'Test', date: '2025-05-01', block: 5, week: 1, tags: [] },
        sections: [
          {
            sectionType: 'main',
            items: [
              {
                itemKind: 'superset',
                name: 'Push/Pull',
                rounds: [
                  {
                    roundNumber: 1,
                    exercises: [
                      { name: 'Push-ups', weight: null, reps: 12, rpe: 7 },
                      { name: 'Row', weight: 45, reps: 10, rpe: 7 }
                    ],
                    restAfterRound: 90
                  }
                ]
              }
            ]
          }
        ],
        exerciseIndex: {
          'push-ups': { name: 'Push-ups', totalSets: 1, totalReps: 12, totalVolume: 0, avgRPE: 7, locations: [{ section: 'main', itemIndex: 0, exerciseIndex: 0 }] },
          'row': { name: 'Row', totalSets: 1, totalReps: 10, totalVolume: 450, avgRPE: 7, locations: [{ section: 'main', itemIndex: 0, exerciseIndex: 1 }] }
        }
      };

      const result = FormBuilder.validatePerformanceV2(validSuperset);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('collectNestedData', () => {
    it('should extract basic session structure from JSON', () => {
      const sessionJSON = JSON.stringify({
        metadata: {
          title: 'Upper Body Strength',
          date: '2025-05-01',
          block: 5,
          week: 1,
          tags: ['strength', 'upper']
        },
        warmup: [
          {
            name: 'Arm Circles',
            logType: 'rpe',
            sets: 1
          }
        ],
        main: [],
        cooldown: []
      });

      // Mock form data collection
      const originalGetSetData = FormBuilder.getSetDataForExercise;
      FormBuilder.getSetDataForExercise = vi.fn(() => ({ weight: null, reps: null, rpe: 6 }));

      const result = FormBuilder.collectNestedData(sessionJSON);

      expect(result.metadata).toMatchObject({
        title: 'Upper Body Strength',
        date: '2025-05-01',
        block: 5,
        week: 1,
        tags: ['strength', 'upper']
      });

      expect(result.sections).toHaveLength(1); // Only warmup has data
      expect(result.sections[0].sectionType).toBe('warmup');
      expect(result.sections[0].items).toHaveLength(1);

      FormBuilder.getSetDataForExercise = originalGetSetData;
    });

    it('should handle supersets with children', () => {
      const sessionJSON = JSON.stringify({
        metadata: {
          title: 'Test Workout',
          date: '2025-05-01',
          block: 5,
          week: 1,
          tags: []
        },
        warmup: [],
        main: [
          {
            name: 'Push/Pull Superset',
            logType: 'superset',
            sets: 3,
            rest: 90,
            children: [
              { name: 'Push-ups', logType: 'strength' },
              { name: 'Dumbbell Row', logType: 'strength' }
            ]
          }
        ],
        cooldown: []
      });

      const originalCollectRounds = FormBuilder.collectRoundsForSuperset;
      FormBuilder.collectRoundsForSuperset = vi.fn(() => [
        {
          roundNumber: 1,
          exercises: [
            { name: 'Push-ups', weight: null, reps: 12, rpe: 7 },
            { name: 'Dumbbell Row', weight: 45, reps: 10, rpe: 7 }
          ],
          restAfterRound: 90
        }
      ]);

      const result = FormBuilder.collectNestedData(sessionJSON);

      expect(result.sections[0].items[0]).toMatchObject({
        itemKind: 'superset',
        name: 'Push/Pull Superset'
      });
      expect(result.sections[0].items[0].rounds).toHaveLength(1);

      FormBuilder.collectRoundsForSuperset = originalCollectRounds;
    });

    it('should skip empty sections', () => {
      const sessionJSON = JSON.stringify({
        metadata: { title: 'Test', date: '2025-05-01', block: 5, week: 1, tags: [] },
        warmup: [],
        main: [
          {
            name: 'Goblet Squat',
            logType: 'strength',
            sets: 3
          }
        ],
        cooldown: []
      });

      const originalGetSetData = FormBuilder.getSetDataForExercise;
      FormBuilder.getSetDataForExercise = vi.fn(() => ({ weight: 50, reps: 8, rpe: 7 }));

      const result = FormBuilder.collectNestedData(sessionJSON);

      // Should only have 'main' section, not warmup or cooldown
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].sectionType).toBe('main');

      FormBuilder.getSetDataForExercise = originalGetSetData;
    });

    it('should build exerciseIndex automatically', () => {
      const sessionJSON = JSON.stringify({
        metadata: { title: 'Test', date: '2025-05-01', block: 5, week: 1, tags: [] },
        warmup: [],
        main: [
          {
            name: 'Goblet Squat',
            logType: 'strength',
            sets: 3
          }
        ],
        cooldown: []
      });

      const originalGetSetData = FormBuilder.getSetDataForExercise;
      FormBuilder.getSetDataForExercise = vi.fn((exKey: string, setNum: number) => ({
        weight: 50,
        reps: 8,
        rpe: 7
      }));

      const result = FormBuilder.collectNestedData(sessionJSON);

      expect(result.exerciseIndex).toHaveProperty('goblet squat');
      expect(result.exerciseIndex['goblet squat']).toMatchObject({
        name: 'Goblet Squat',
        totalSets: 3,
        totalReps: 24,
        totalVolume: 1200
      });

      FormBuilder.getSetDataForExercise = originalGetSetData;
    });
  });
});
