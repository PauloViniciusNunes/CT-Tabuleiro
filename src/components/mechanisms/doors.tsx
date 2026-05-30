export function mirror(x: number, inferiorLimit: number, superiorLimit: number) {

    if (inferiorLimit > superiorLimit) throw new Error("O limite inferior está configurado como sendo maior que o limite superior.");

    const middle: number = (inferiorLimit + superiorLimit) / 2;
    const firstInterval: boolean = (x <= middle) ? true : false;

    return firstInterval ? 2 * middle - x : middle - Math.abs(x - middle);
}

export function cartesianMirror(x: number, y: number, xInferiorLimit: number, xSuperiorLimit: number, yInferiorLimit: number, ySuperiorLimit: number) {
    return [mirror(x, xInferiorLimit, xSuperiorLimit), mirror(y, yInferiorLimit, ySuperiorLimit)];
}
