import Geometry from '../geometry';
import Voronoi from "../voronoi";
import pcghash from "../pcghash";
import Cache2D from "../cache2d";

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

        this._metrics = {
            tileSize: 128, // nombre de pixel de coté composant chaque tuile
            voronoiCellSize: 50, // taille d'une cellule voronoi (en nombre de tuile)
            voronoiClusterSize: 6, // taille d'un groupement de germes voronoi (nombre de germes par coté)
        };

        this._cacheVoronoi = new Cache2D();
        this._cacheVoronoi.size = 9;
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
        const vcsOddOffset = odd ? m.voronoiCellSize >> 1 : 0;
        const vcsDelta = Math.floor(m.voronoiCellSize / 5);
        const xGerm_rpt = Math.floor(this.rpg_rpt(x_rpg) - vcsOddOffset + vcsDelta * hx);
        const yGerm_rpt = Math.floor(this.rpg_rpt(y_rpg) + vcsDelta * hy);
        return {x: xGerm_rpt, y: yGerm_rpt};
    }

    /**
     * Calcule le cluster voronoi x, y
     * @param x_rpv {number} coordonnées rpv
     * @param y_rpv {number}
     */
    computeVoronoiCluster(x_rpv, y_rpv) {
        let v = this._cacheVoronoi.load(x_rpv, y_rpv);
        if (v !== null) {
            return v;
        }
        const m = this.metrics;
        v = new Voronoi();
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
        v.computeNearest(6);
        this._cacheVoronoi.store(x_rpv, y_rpv, v);
        return v;
    }


    render() {
        const view = this.view;
        const viewPoints = view.points();
        const x_rpt = this.rpe_rpt(view.position.x);
        const y_rpt = this.rpe_rpt(view.position.y);
        const x_rpv = this.rpg_rpv(this.rpt_rpg(x_rpt));
        const y_rpv = this.rpg_rpv(this.rpt_rpg(y_rpt));
        const vor = this.computeVoronoiCluster(x_rpv, y_rpv);
    }

}

export default Cartography;