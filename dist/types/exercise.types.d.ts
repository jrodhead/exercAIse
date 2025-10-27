export interface ExerciseScaling {
    regressions?: string[];
    progressions?: string[];
}
export interface ExercisePrescriptionHints {
    load?: string;
    reps?: string;
    time?: string;
    distance?: string;
    rpe?: string;
    notes?: string;
}
export interface ExerciseJoints {
    sensitiveJoints?: string[];
    notes?: string;
}
export interface ExerciseMedia {
    video?: string;
    images?: string[];
}
export interface Exercise {
    name: string;
    equipment?: string[];
    tags?: string[];
    setup?: string[];
    steps?: string[];
    cues?: string[];
    mistakes?: string[];
    safety?: string;
    scaling?: ExerciseScaling;
    variations?: string[];
    prescriptionHints?: ExercisePrescriptionHints;
    joints?: ExerciseJoints;
    media?: ExerciseMedia;
}
//# sourceMappingURL=exercise.types.d.ts.map