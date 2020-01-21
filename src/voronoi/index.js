import Geometry from '../geometry';

class Voronoi {
    constructor() {
        this._germs = [];
        this._pushIndex = 0;
    }

    get germs() {
        return this._germs;
    }

    addPoint(x, y, interior = false) {
        const index = ++this._pushIndex;
        this._germs.push({
            index,
            x,
            y,
            nearest: [],
            region: [
                {x: null, y: null},
                {x: null, y: null}
            ],
            interior
        });
    }

    computeNearestPoint(p, n) {
        this._germs
            .filter(pi => pi.index !== p.index)
            .map(pi => ({
                x: pi.x,
                y: pi.y,
                distance: (pi.x - p.x) * (pi.x - p.x) + (pi.y - p.y) * (pi.y - p.y),
                index: {
                    origin: p.index,
                    nearest: pi.index
                },
                median: {
                    x: (pi.x + p.x) / 2,
                    y: (pi.y + p.y) / 2
                }
            }))
            .sort((pa, pb) => pa.distance - pb.distance)
            .slice(0, n)
            .forEach(pi => p.nearest.push(pi));
    }

    computeNearest(n) {
        this._germs
            .filter(p => p.interior)
            .forEach(p => {
                this.computeNearestPoint(p, n);
                const xMin = p.nearest.reduce((prev, curr) => Math.min(curr.x, prev), Infinity);
                const yMin = p.nearest.reduce((prev, curr) => Math.min(curr.y, prev), Infinity);
                const xMax = p.nearest.reduce((prev, curr) => Math.max(curr.x, prev), -Infinity);
                const yMax = p.nearest.reduce((prev, curr) => Math.max(curr.y, prev), -Infinity);
                p.region = [{x: xMin, y: yMin}, {x: xMax, y: yMax}];
            });
    }

    isInsideSemiPlaneNearest(x, y, p, pn) {
        // get median point
        const m = pn.median;
        // create vectors
        const vMedian = new Geometry.Vector(m.x, m.y);
        const vSeed = new Geometry.Vector(p.x, p.y);
        const vTarget = new Geometry.Vector(x, y);
        const vBase = vSeed.sub(vMedian);
        const vCheck = vTarget.sub(vMedian);
        if (vCheck.magnitude() === 0) {
            return true;
        }
        const fAngle = Math.abs(vCheck.angle(vBase));
        return fAngle <= (Math.PI / 2);
    }

    isInsideSemiPlane(x, y, p) {
        return p.nearest.every(pi => this.isInsideSemiPlaneNearest(x, y, p, pi));
    }

    getCellPoints(index, rect = null) {
        const p = this._germs[index];
        const bRectDefined = rect !== null;
        let xMin = bRectDefined ? rect[0].x : p.region[0].x;
        let yMin = bRectDefined ? rect[0].y : p.region[0].y;
        let xMax = bRectDefined ? rect[1].x : p.region[1].x;
        let yMax = bRectDefined ? rect[1].y : p.region[1].y;
        const aPoints = [];
        for (let y = yMin; y <= yMax; ++y) {
            for (let x = xMin; x <= xMax; ++x) {
                if (this.isInsideSemiPlane(x, y, p)) {
                    aPoints.push({x, y});
                }
            }
        }
        return aPoints;
    }
}


export default Voronoi;