import type { MapObject } from "@prisma/client";

export interface GridPoint {
    readonly col: number;
    readonly row: number;
}

function key(point: GridPoint): string {
    return `${point.col}:${point.row}`;
}

interface CornerCrossing {
    readonly horizontalNeighbor: GridPoint;
    readonly verticalNeighbor: GridPoint;
}

interface GridTrace {
    readonly cells: GridPoint[];
    readonly corners: CornerCrossing[];
}

/**
 * Traverses a segment between cell centers. An exact corner crossing advances
 * diagonally instead of arbitrarily claiming either adjacent orthogonal cell.
 */
function traceGrid(from: GridPoint, to: GridPoint): GridTrace {
    const cells: GridPoint[] = [{ ...from }];
    const corners: CornerCrossing[] = [];
    const deltaCol = to.col - from.col;
    const deltaRow = to.row - from.row;
    if (deltaCol === 0 && deltaRow === 0) return { cells, corners };

    const stepCol = Math.sign(deltaCol);
    const stepRow = Math.sign(deltaRow);
    const deltaTimeCol = deltaCol === 0 ? Number.POSITIVE_INFINITY : 1 / Math.abs(deltaCol);
    const deltaTimeRow = deltaRow === 0 ? Number.POSITIVE_INFINITY : 1 / Math.abs(deltaRow);
    let nextColBoundary = deltaTimeCol / 2;
    let nextRowBoundary = deltaTimeRow / 2;
    let current = { ...from };
    const epsilon = 1e-10;

    while (current.col !== to.col || current.row !== to.row) {
        if (Math.abs(nextColBoundary - nextRowBoundary) <= epsilon) {
            corners.push({
                horizontalNeighbor: {
                    col: current.col + stepCol,
                    row: current.row,
                },
                verticalNeighbor: {
                    col: current.col,
                    row: current.row + stepRow,
                },
            });
            current = {
                col: current.col + stepCol,
                row: current.row + stepRow,
            };
            nextColBoundary += deltaTimeCol;
            nextRowBoundary += deltaTimeRow;
        } else if (nextColBoundary < nextRowBoundary) {
            current = { col: current.col + stepCol, row: current.row };
            nextColBoundary += deltaTimeCol;
        } else {
            current = { col: current.col, row: current.row + stepRow };
            nextRowBoundary += deltaTimeRow;
        }
        cells.push(current);
    }

    return { cells, corners };
}

/** Returns every grid cell whose interior is crossed by the movement segment. */
export function traceGridPath(from: GridPoint, to: GridPoint): GridPoint[] {
    return traceGrid(from, to).cells;
}

export function assertWallPathIsClear(
    from: GridPoint,
    to: GridPoint,
    mapObjects: readonly Pick<MapObject, "type" | "col" | "row">[],
): void {
    const walls = new Set(
        mapObjects
            .filter((object) => object.type === "wall")
            .map((object) => key(object)),
    );
    const trace = traceGrid(from, to);
    const crossedWall = trace.cells
        .slice(1)
        .find((point) => walls.has(key(point)));

    if (crossedWall) {
        throw new Error(
            `O movimento atravessa uma parede em (${crossedWall.col}, ${crossedWall.row}).`,
        );
    }

    const closedCorner = trace.corners.find((corner) =>
        walls.has(key(corner.horizontalNeighbor)) &&
        walls.has(key(corner.verticalNeighbor)),
    );
    if (closedCorner) {
        throw new Error(
            "O movimento tenta atravessar a quina fechada entre duas paredes.",
        );
    }
}
