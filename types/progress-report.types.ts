/**
 * Progress Report Type Definitions
 * 
 * TypeScript types matching schemas/progress-report.schema.json
 * Used by ProgressReportRenderer for type-safe rendering
 */

// ============================================================================
// Metadata & Summary
// ============================================================================

export interface Metadata {
  title: string;
  period: string;
  generatedDate: string;
  author?: string;
}

export interface KPI {
  label: string;
  value: string | number;
  unit?: string;
}

export interface Summary {
  grade?: string;
  kpis?: KPI[];
  highlights?: string[];
  injuryStatus?: string;
}

// ============================================================================
// Table Types
// ============================================================================

export interface TableRow {
  [key: string]: string | number | boolean | null;
}

export interface ExerciseTable {
  type: 'exercise';
  headers: string[];
  rows: TableRow[];
  notes?: string;
}

export interface GenericTable {
  type: 'generic';
  headers: string[];
  rows: TableRow[];
  notes?: string;
}

export type Table = ExerciseTable | GenericTable;

// ============================================================================
// Section Types (Polymorphic via Discriminated Union)
// ============================================================================

export interface StrengthAnalysisSection {
  type: 'strength-analysis';
  title: string;
  movementPattern: string;
  analysis: string;
  exercises?: string[];
  progressionNotes?: string;
}

export interface TableSection {
  type: 'table';
  title: string;
  table: Table;
}

export interface TextSection {
  type: 'text';
  title?: string;
  content: string;
}

export interface HighlightBoxSection {
  type: 'highlight-box';
  title?: string;
  content: string;
  variant?: 'info' | 'warning' | 'success';
}

export interface KpiGridSection {
  type: 'kpi-grid';
  title?: string;
  kpis: KPI[];
}

/**
 * Section union type (discriminated by 'type' property)
 */
export type Section =
  | StrengthAnalysisSection
  | TableSection
  | TextSection
  | HighlightBoxSection
  | KpiGridSection;

// ============================================================================
// Root Report Type
// ============================================================================

export interface ProgressReport {
  version: string;
  metadata: Metadata;
  summary?: Summary;
  sections: Section[];
}

// ============================================================================
// Renderer Options & Utilities
// ============================================================================

export interface RenderOptions {
  container: HTMLElement;
  showMetadata?: boolean;
  showSummary?: boolean;
  darkMode?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// Type Guards
// ============================================================================

export function isStrengthAnalysisSection(section: Section): section is StrengthAnalysisSection {
  return section.type === 'strength-analysis';
}

export function isTableSection(section: Section): section is TableSection {
  return section.type === 'table';
}

export function isTextSection(section: Section): section is TextSection {
  return section.type === 'text';
}

export function isHighlightBoxSection(section: Section): section is HighlightBoxSection {
  return section.type === 'highlight-box';
}

export function isKpiGridSection(section: Section): section is KpiGridSection {
  return section.type === 'kpi-grid';
}

export function isExerciseTable(table: Table): table is ExerciseTable {
  return table.type === 'exercise';
}

export function isGenericTable(table: Table): table is GenericTable {
  return table.type === 'generic';
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateProgressReport(report: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!report) {
    errors.push({ field: 'root', message: 'Report object is null or undefined' });
    return { valid: false, errors };
  }

  if (!report.version || typeof report.version !== 'string') {
    errors.push({ field: 'version', message: 'Version is missing or not a string' });
  }

  if (!report.metadata || typeof report.metadata !== 'object') {
    errors.push({ field: 'metadata', message: 'Metadata is missing or not an object' });
  } else {
    if (!report.metadata.title) {
      errors.push({ field: 'metadata.title', message: 'Title is required' });
    }
    if (!report.metadata.period) {
      errors.push({ field: 'metadata.period', message: 'Period is required' });
    }
    if (!report.metadata.generatedDate) {
      errors.push({ field: 'metadata.generatedDate', message: 'Generated date is required' });
    }
  }

  if (!report.sections || !Array.isArray(report.sections)) {
    errors.push({ field: 'sections', message: 'Sections is missing or not an array' });
  } else if (report.sections.length === 0) {
    errors.push({ field: 'sections', message: 'Sections array is empty' });
  } else {
    report.sections.forEach((section: any, index: number) => {
      if (!section.type) {
        errors.push({ field: `sections[${index}].type`, message: 'Section type is required' });
      } else {
        const validTypes = ['strength-analysis', 'table', 'text', 'highlight-box', 'kpi-grid'];
        if (!validTypes.includes(section.type)) {
          errors.push({ field: `sections[${index}].type`, message: `Invalid section type: ${section.type}` });
        }
      }

      // Type-specific validation
      if (section.type === 'strength-analysis') {
        if (!section.title) errors.push({ field: `sections[${index}].title`, message: 'Title is required for strength-analysis' });
        if (!section.movementPattern) errors.push({ field: `sections[${index}].movementPattern`, message: 'Movement pattern is required' });
        if (!section.analysis) errors.push({ field: `sections[${index}].analysis`, message: 'Analysis is required' });
      }

      if (section.type === 'table') {
        if (!section.title) errors.push({ field: `sections[${index}].title`, message: 'Title is required for table' });
        if (!section.table || typeof section.table !== 'object') {
          errors.push({ field: `sections[${index}].table`, message: 'Table object is required' });
        } else {
          if (!section.table.type || !['exercise', 'generic'].includes(section.table.type)) {
            errors.push({ field: `sections[${index}].table.type`, message: 'Table type must be "exercise" or "generic"' });
          }
          if (!Array.isArray(section.table.headers) || section.table.headers.length === 0) {
            errors.push({ field: `sections[${index}].table.headers`, message: 'Table headers are required' });
          }
          if (!Array.isArray(section.table.rows)) {
            errors.push({ field: `sections[${index}].table.rows`, message: 'Table rows must be an array' });
          }
        }
      }

      if (section.type === 'text') {
        if (!section.content) errors.push({ field: `sections[${index}].content`, message: 'Content is required for text section' });
      }

      if (section.type === 'highlight-box') {
        if (!section.content) errors.push({ field: `sections[${index}].content`, message: 'Content is required for highlight-box' });
        if (section.variant && !['info', 'warning', 'success'].includes(section.variant)) {
          errors.push({ field: `sections[${index}].variant`, message: 'Variant must be "info", "warning", or "success"' });
        }
      }

      if (section.type === 'kpi-grid') {
        if (!Array.isArray(section.kpis) || section.kpis.length === 0) {
          errors.push({ field: `sections[${index}].kpis`, message: 'KPIs array is required and must not be empty' });
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Export for ES Module Compatibility
// ============================================================================

export {};
