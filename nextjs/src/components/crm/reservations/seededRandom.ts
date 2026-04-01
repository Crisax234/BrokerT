/**
 * Deterministic random utilities seeded by lead ID.
 * Ensures placeholder values stay stable across re-renders.
 */

export function seededRandom(seed: string, index: number): number {
    let hash = 0;
    const str = seed + ':' + index;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

export function seededPick<T>(seed: string, index: number, options: T[]): T {
    return options[seededRandom(seed, index) % options.length];
}

export function seededBool(seed: string, index: number): boolean {
    return seededRandom(seed, index) % 2 === 0;
}
