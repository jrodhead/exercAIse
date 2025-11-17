interface ExerciseReference {
    title: string;
    url?: string;
}
interface PrescriptionRow {
    set: number;
    reps?: number;
    weight?: number;
    multiplier?: number;
    rpe?: number;
    timeSeconds?: number;
    holdSeconds?: number;
    distanceMeters?: number;
    distanceMiles?: number;
    angle?: number;
}
interface PrescriptionsByExercise {
    [exerciseKey: string]: PrescriptionRow[];
}
interface WeightSpec {
    weight: number | null;
    multiplier: number | null;
}
//# sourceMappingURL=session-parser.d.ts.map