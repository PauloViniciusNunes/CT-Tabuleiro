export function setTransformerAdd(
    v1: string[],
    v2: string[]
): string[] {
    return [
        ...new Set([
            ...v1,
            ...v2
        ])
    ];
}

export function complemento<T>(
    A: Set<T>,
    B: Set<T>
): Set<T> {
    return new Set(
        [...B].filter(
            x => !A.has(x)
        )
    );
}

export function equalsSets<T>(
    A: Set<T>,
    B: Set<T>
): boolean {
    if (A.size !== B.size)
        return false;

    for (const el of A)
        if (!B.has(el))
            return false;

    return true;
}


export function setTransformerRemove(
    p: string[],
    I: string[],
    vi: string[][]
): string[] {
    let sp =
        new Set(p);

    let si =
        new Set(I);

    const originalSi =
        new Set(I);

    for (const v of vi) {
        const sc =
            new Set(v);

        if (
            equalsSets(
                originalSi,
                sc
            )
        )
            continue;

        si =
            complemento(
                sc,
                si
            );
    }

    sp =
        complemento(
            si,
            sp
        );

    return [...sp];
}

