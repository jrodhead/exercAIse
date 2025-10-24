/**
 * Type definitions for workout session data structures
 * Based on schemas/session.schema.json
 */

export type SectionType = 
  | 'Warm-up' 
  | 'Main Work' 
  | 'Strength' 
  | 'Conditioning' 
  | 'Accessory/Core' 
  | 'Cooldown/Recovery' 
  | 'Recovery' 
  | 'Mobility';

export type ItemKind = 'exercise' | 'superset' | 'circuit' | 'note';

export type LogType = 'strength' | 'endurance' | 'carry' | 'mobility' | 'stretch';

export interface Prescription {
  sets?: number;
  reps?: number | string;
  weight?: number | string;
  rpe?: number;
  timeSeconds?: number;
  holdSeconds?: number;
  distanceMeters?: number;
  distanceMiles?: number;
  tempo?: string;
  restSeconds?: number;
}

export interface Item {
  kind: ItemKind;
  name: string;
  link?: string;
  logType?: LogType;
  loggable?: boolean;
  prescription?: Prescription;
  children?: Item[];
  cues?: string[];
  notes?: string;
}

export interface Section {
  type: SectionType;
  title: string;
  rounds?: number;
  notes?: string;
  items?: Item[];
}

export interface WorkoutSession {
  version?: string;
  title: string;
  date?: string;
  block: number;
  week: number;
  notes?: string;
  sections: Section[];
}
