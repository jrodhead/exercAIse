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
export type Section = StrengthAnalysisSection | TableSection | TextSection | HighlightBoxSection | KpiGridSection;
export interface ProgressReport {
    version: string;
    metadata: Metadata;
    summary?: Summary;
    sections: Section[];
}
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
export declare function isStrengthAnalysisSection(section: Section): section is StrengthAnalysisSection;
export declare function isTableSection(section: Section): section is TableSection;
export declare function isTextSection(section: Section): section is TextSection;
export declare function isHighlightBoxSection(section: Section): section is HighlightBoxSection;
export declare function isKpiGridSection(section: Section): section is KpiGridSection;
export declare function isExerciseTable(table: Table): table is ExerciseTable;
export declare function isGenericTable(table: Table): table is GenericTable;
export declare function validateProgressReport(report: any): ValidationResult;
export {};
//# sourceMappingURL=progress-report.types.d.ts.map