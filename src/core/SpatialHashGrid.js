export class SpatialHashGrid {
    constructor(cellSize = 50) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    _cellKey(ix, iy, iz) {
        return `${ix},${iy},${iz}`;
    }

    _coordsForPosition(pos) {
        return {
            ix: Math.floor(pos.x / this.cellSize),
            iy: Math.floor(pos.y / this.cellSize),
            iz: Math.floor(pos.z / this.cellSize),
        };
    }

    _addToCell(entity, ix, iy, iz) {
        const key = this._cellKey(ix, iy, iz);
        if (!this.cells.has(key)) {
            this.cells.set(key, new Set());
        }
        this.cells.get(key).add(entity);
    }

    _removeFromCell(entity, ix, iy, iz) {
        const key = this._cellKey(ix, iy, iz);
        const cell = this.cells.get(key);
        if (!cell) return;
        cell.delete(entity);
        if (cell.size === 0) this.cells.delete(key);
    }

    insert(entity, position) {
        const { ix, iy, iz } = this._coordsForPosition(position);
        entity.__gridCell = { ix, iy, iz };
        this._addToCell(entity, ix, iy, iz);
    }

    update(entity, position) {
        const prev = entity.__gridCell;
        const { ix, iy, iz } = this._coordsForPosition(position);
        if (prev && prev.ix === ix && prev.iy === iy && prev.iz === iz) return;
        if (prev) this._removeFromCell(entity, prev.ix, prev.iy, prev.iz);
        entity.__gridCell = { ix, iy, iz };
        this._addToCell(entity, ix, iy, iz);
    }

    remove(entity) {
        const prev = entity.__gridCell;
        if (!prev) return;
        this._removeFromCell(entity, prev.ix, prev.iy, prev.iz);
        delete entity.__gridCell;
    }

    queryRadius(position, radius) {
        const range = Math.ceil(radius / this.cellSize);
        const center = this._coordsForPosition(position);
        const results = new Set();

        for (let x = center.ix - range; x <= center.ix + range; x += 1) {
            for (let y = center.iy - range; y <= center.iy + range; y += 1) {
                for (let z = center.iz - range; z <= center.iz + range; z += 1) {
                    const key = this._cellKey(x, y, z);
                    const cell = this.cells.get(key);
                    if (!cell) continue;
                    cell.forEach((entity) => results.add(entity));
                }
            }
        }

        return Array.from(results);
    }
}
