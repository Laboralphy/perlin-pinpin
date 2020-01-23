import Geometry from '../geometry';
import Voronoi from "../voronoi";
import pcghash from "../pcghash";
import Cache2D from "../cache2d";
import Perlin from "../perlin";
import Random from "../random";


const {Vector, View, Point} = Geometry;


class Cartography {

    /*

    rpe : référentiel de positionnement entité
    rpt : référentiel de positionnement tuile
    rpg : référentiel de positionnement germe de voronoi
    rpv : référentiel de positionnement cluster de voronoi

    1 rpv = voronoiClusterSize rpg
    1 rpg = voronoiCellSize rpt
    1 rpt = tileSize rpe
    1 rpe = 1 pixel

     */


    constructor(seed = 0) {
        this._view = new View();
        this._masterSeed = seed;
        this._rand = new Random();
        this._rand.seed = seed;

        this._metrics = {
            tileSize: 128, // nombre de pixel de coté composant chaque tuile
            voronoiCellSize: 50, // taille d'une cellule voronoi (en nombre de tuile)
            voronoiClusterSize: 6, // taille d'un groupement de germes voronoi (nombre de germes par coté)
        };

        this._cacheVoronoi = new Cache2D({
            size: 9
        });
    }

    rpe_rpt(n) { return Math.floor(n / this.metrics.tileSize); }
    rpt_rpg(n) { return Math.floor(n / this.metrics.voronoiCellSize); }
    rpg_rpv(n) { return Math.floor(n / this.metrics.voronoiClusterSize); }
    rpt_rpe(n) { return n * this.metrics.tileSize; }
    rpg_rpt(n) { return n * this.metrics.voronoiCellSize; }
    rpv_rpg(n) { return n * this.metrics.voronoiClusterSize; }

    get seed() {
        return this._masterSeed;
    }

    get view() {
        return this._view;
    }

    get metrics() {
        return this._metrics;
    }

    /**
     * pour un germe donné, calcule ses position RPT en ajoutant un offset pseudo aléatoire
     * @param x_rpg {number}
     * @param y_rpg {number}
     * @return {x, y} RPT
     */
    computeVoronoiGermOffset(x_rpg, y_rpg) {
        const odd = (y_rpg & 1) !== 0;
        const h = pcghash(x_rpg, y_rpg, this.seed);
        const hx = ((h & 255) - 128) / 128;
        const hy = (((h >> 8) & 255) - 128) / 128;
        const m = this.metrics;
        const vcs = m.voronoiCellSize;
        const vcs2 = vcs >> 1;
        const vcsOddOffset = odd ? vcs2 : 0;
        const vcsDelta = Math.floor(vcs / 5);
        const xGerm_rpt = Math.floor(this.rpg_rpt(x_rpg) - vcsOddOffset + vcsDelta * hx);
        const yGerm_rpt = Math.floor(this.rpg_rpt(y_rpg) + vcsDelta * hy);
        return {x: xGerm_rpt, y: yGerm_rpt};
    }

    /**
     * Calcule le cluster voronoi x, y
     * @param x_rpv {number} coordonnées rpv
     * @param y_rpv {number}
     */
    getVoronoiCluster(x_rpv, y_rpv) {
        const m = this.metrics;
        const v = new Voronoi();
        const VOR_CLUSTER_SIZE_RPG = m.voronoiClusterSize;
        const VOR_CELL_SIZE_RPT = m.voronoiCellSize;

        // position rpg de debut
        const xBase_rpg = this.rpv_rpg(x_rpv);
        const yBase_rpg = this.rpv_rpg(y_rpv);

        // position rpg de fin
        const xEnd_rpg = xBase_rpg + VOR_CLUSTER_SIZE_RPG;
        const yEnd_rpg = yBase_rpg + VOR_CLUSTER_SIZE_RPG;

        // bordure additionnelle
        // les germes sont espacés de voronoiCellSize tuiles
        // il faut déterminer combien il y a de tuiles visible maximum dans la vue
        // dans le cas ou le coin supérieur haut de la vue serai positionné sur le coin inférieur droit
        // du cluster voronoi
        const vsize_rpe = Math.max(this.view.width, this.view.height);
        // ce qui fait en nombre de tuiles
        const border_rpt = this.rpe_rpt(vsize_rpe);
        // ce qui fait en nombre de rpg
        const border_rpg = this.rpt_rpg(border_rpt);
        const pad_rpg = 2;

        // creation des germes
        for (
            let yGerm_rpg = -pad_rpg;
            yGerm_rpg <= VOR_CLUSTER_SIZE_RPG + border_rpg + pad_rpg;
            ++yGerm_rpg
        ) {
            const bInteriorY = yGerm_rpg >= 0 && yGerm_rpg <= VOR_CLUSTER_SIZE_RPG + border_rpg;
            const odd = yGerm_rpg & 1;
            for (
                let xGerm_rpg = -pad_rpg;
                xGerm_rpg < VOR_CLUSTER_SIZE_RPG + border_rpg + pad_rpg + odd;
                ++xGerm_rpg
            ) {
                const bInteriorX = xGerm_rpg >= 0 && xGerm_rpg <= VOR_CLUSTER_SIZE_RPG + border_rpg + odd;
                const posGerm_rpt = this.computeVoronoiGermOffset(xBase_rpg + xGerm_rpg, yBase_rpg + yGerm_rpg);
                const xGerm_rpt = posGerm_rpt.x;
                const yGerm_rpt = posGerm_rpt.y;
                v.addPoint(
                    xGerm_rpt,
                    yGerm_rpt,
                    bInteriorY && bInteriorX
                );
            }
        }
        v.compute(6);
        return v;
    }

    /**
     * Transforme un rectangle en carré
     * @param w {number}
     * @param h {number}
     * @private
     * @return {n, x, y}
     */
    _resquare(w, h) {
        const size = Math.max(w, h);
        const xOfs = (size - w) >> 1;
        const yOfs = (size - h) >> 1;
        return {xOfs, yOfs, size};
    }

    _createArray2D (w, h) {
        const a = [];
        for (let y = 0; y < h; ++y) {
            const r = [];
            for (let x = 0; x < w; ++x) {
                r.push(-1);
            }
            a.push(r);
        }
        return a;
    }

    static generateCellWhiteNoise(w, h, rand) {
        let r, a = [];
        for (let x, y = 0; y < h; ++y) {
            r = [];
            for (x = 0; x < w; ++x) {
                r[x] = rand(x, y);
            }
            a[y] = r;
        }
        return a;
    }


    computeContinentalPerlinNoise(map, size, hash) {
        this._rand.seed = hash;

        const wn = Cartography.generateCellWhiteNoise(size, size, (x, y) => {
            const f = this._rand.rand();
            switch (hash % 4) {
                case 0: // halved
                    return f / 2;

                case 1: // rounded
                    return Math.sqrt(f);

                case 2: // rounded
                    return f * f;

                case 3: // rounded
                    return f * f * f;

                case 4: // rounded
                    return f * f * f * f;

                default:
                    return f;
            }
        });
        const pn = Perlin.generate(wn, 6);
        return map.map((row, y) => row.map((c, x) => pn[y][x] * c));
    }

    /**
     * Calcule une height map associée à la cellule de voronoi spécifée
     * cette heightmap est la base du relief de l'île qui sera générée dans cette cellule
     */
    computeBaseHeightMap(x_rpv, y_rpv) {
        let oStructure = this._cacheVoronoi.load(x_rpv, y_rpv);
        if (oStructure !== null) {
            return oStructure;
        }
        const vor = this.getVoronoiCluster(x_rpv, y_rpv);
        oStructure = {
            maps: []
        };
        // récupérer la liste des rectangles
        vor
            .germs
            .filter(g => g.interior)
            .forEach(g => {
                const xStart = g.regions.inner[0].x;
                const yStart = g.regions.inner[0].y;
                const oSquare = this._resquare(g.regions.inner[1].x - xStart + 1, g.regions.inner[1].y - yStart + 1);
                const aMap = this._createArray2D(oSquare.size, oSquare.size);
                g.points.forEach(p => {
                    aMap[p.y - yStart][p.x - xStart] = p.d;
                });
                const hash = pcghash(g.x, g.y, this.seed);
                const oCell = {
                    size: oSquare.size,
                    offset: {
                        x: xStart,
                        y: yStart
                    },
                    map: this.computeContinentalPerlinNoise(aMap, oSquare.size, hash),
                    hash
                };
                oStructure.maps.push(oCell);
            });
        this._cacheVoronoi.store(x_rpv, y_rpv, oStructure);
        return oStructure;
    }


    render() {
        const view = this.view;
        const viewPoints = view.points();
        const x_rpt = this.rpe_rpt(view.position.x);
        const y_rpt = this.rpe_rpt(view.position.y);
        const x_rpv = this.rpg_rpv(this.rpt_rpg(x_rpt));
        const y_rpv = this.rpg_rpv(this.rpt_rpg(y_rpt));
        const vor = this.computeVoronoiCluster(x_rpv, y_rpv);
        // pour chaque tuile contenue dans la view
        const pVor = vor.getOnePoint(x_rpt, y_rpt);
        console.log(x_rpt, y_rpt, pVor);
    }

}

export default Cartography;
