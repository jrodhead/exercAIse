import type { PerformanceLog } from './performance.types';
import type { StorageAdapter } from '../lib/storage';
export interface FormBuilderDependencies {
    slugify: (s: string) => string;
    extractExercisesFromJSON: (json: string) => any[];
    extractExercisesFromMarkdown: (md: string) => any[];
    parseJSONPrescriptions: (json: string) => {
        [key: string]: any[];
    };
    parseMarkdownPrescriptions: (md: string) => {
        [key: string]: any[];
    };
    loadSaved: (filePath: string) => any | null;
    saveLocal: (filePath: string, data: PerformanceLog) => void;
    parseHMSToSeconds: (text: string | number | null | undefined) => number | null;
    secondsToHHMMSS: (totalSeconds: number | null | undefined) => string;
    renderMarkdownBasic: (md: string) => string;
    fixExerciseAnchors: (el: HTMLElement) => void;
    status: (msg: string, opts?: {
        important?: boolean;
    }) => void;
    getCurrentSessionJSON: () => string | null;
    workoutContent: HTMLElement;
    exerciseFormsEl: HTMLElement;
    saveBtn: HTMLButtonElement;
    copyBtn: HTMLButtonElement;
    downloadBtn: HTMLButtonElement;
    issueBtn: HTMLButtonElement;
    clearBtn: HTMLButtonElement;
    copyWrapper: HTMLElement;
    copyTarget: HTMLTextAreaElement;
    openIssueLink: HTMLElement;
}
export interface SessionParserAPI {
    slugify: (s: string) => string;
    parseHMSToSeconds: (text: string | number | null | undefined) => number | null;
    secondsToHHMMSS: (totalSeconds: number | null | undefined) => string;
    extractExercisesFromMarkdown: (md: string) => any[];
    parseMarkdownPrescriptions: (md: string) => {
        [key: string]: any[];
    };
    extractExercisesFromJSON: (json: string) => any[];
    parseJSONPrescriptions: (json: string) => {
        [key: string]: any[];
    };
}
export interface KaiIntegrationAPI {
    init: (dependencies: any) => boolean;
    linkValidation: {
        invalid: string[];
        missing: string[];
    };
    openGeneratedSession: (obj: any) => void;
    validateSessionPlan: (obj: any) => string | null;
    normalizeSessionPlanInPlace: (plan: any) => any;
    validateSessionPlanLinks: (obj: any, cb: (err: string | null) => void) => void;
    isWorkoutJSONShape: (obj: any) => boolean;
    looksLikeSessionPlan: (obj: any) => boolean;
    validateWorkoutLinks: (obj: any, cb: (err: string | null) => void) => void;
    handleGenerateButtons: () => void;
    generateExerciseStub: (slug: string, name: string) => {
        path: string;
        json: string;
    };
    generateExerciseStubsFromObj: (obj: any, missingSlugs: string[]) => string;
    generateExerciseStubsFromPlan: (plan: any, missingSlugs: string[]) => string;
}
declare global {
    interface Window {
        ExercAIse: {
            Storage?: StorageAdapter;
            SessionParser?: SessionParserAPI;
            FormBuilder?: {
                init: (dependencies: Partial<FormBuilderDependencies>) => void;
                buildForm: (filePath: string, raw: string, isJSON: boolean) => void;
            };
            KaiIntegration?: KaiIntegrationAPI;
        };
    }
}
export {};
//# sourceMappingURL=global.types.d.ts.map