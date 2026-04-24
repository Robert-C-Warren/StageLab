export type StageCard = {
    id: string;
    sourceFile: string;
    sourcePage: number;
    eventName: string;
    stageLabel: string;
    stageName: string;
    runPair: string;
    fullTitle: string;
    distanceKm: number;
    date: string;
    stateTimes: string[];
    imagePath?: string;
}