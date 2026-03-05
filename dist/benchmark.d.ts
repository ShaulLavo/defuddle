export interface ManifestEntry {
    url: string;
    sha256: string;
    fetchedAt: string;
    sizeBytes: number;
}
export interface Manifest {
    version: 1;
    entries: ManifestEntry[];
}
export interface UrlMetrics {
    url: string;
    timingsMs: number[];
    medianMs: number;
    minMs: number;
    maxMs: number;
}
export interface RunArtifact {
    id: string;
    mode: 'frozen';
    label: string | null;
    runs: number;
    targetFingerprint: string;
    startedAt: string;
    completedAt: string;
    urlMetrics: UrlMetrics[];
    sumMedianTotalMs: number;
}
export declare function computeTargetFingerprint(urls: string[]): string;
export declare function loadTargets(): Promise<string[]>;
export declare function seed(options?: {
    force?: boolean;
}): Promise<void>;
export declare function loadManifest(): Promise<Manifest>;
export declare function readSnapshot(url: string): Promise<string>;
export declare function run(options: {
    runs?: number;
    label?: string | null;
}): Promise<RunArtifact>;
export declare function loadAllRuns(): Promise<RunArtifact[]>;
export declare function findBestComparableRun(targetFingerprint: string, excludeId?: string): Promise<RunArtifact | null>;
