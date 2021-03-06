import Geometry from '../geometry';
import Voronoi from "../voronoi";
import pcghash from "../pcghash";
import Cache2D from "../cache2d";
import Perlin from "../perlin";
import Random from "../random";
import * as Tools2D from '../tools2d';
import TileGenerator from "./TileGenerator";
import Names from '../names';
import Rainbow from "../rainbow";

const {Vector, View, Point} = Geometry;

class WorldGenerator {

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


    constructor({
            seed = 0,
            palette = null,
            cache = 64,
            tileSize,
            vorCellSize = 50,
            vorClusterSize = 6,
            physicGridSize = 16,
            names,
            scale = 1
        }) {
        this._view = new View();
        this._masterSeed = seed;
        this._rand = new Random();
        this._rand.seed = seed;
        this._physicGridSize = physicGridSize;
        this._scale = scale;

        this._metrics = {
            tileSize, // nombre de pixel de coté composant chaque tuile
            voronoiCellSize: vorCellSize, // taille d'une cellule voronoi (en nombre de tuile)
            voronoiClusterSize: vorClusterSize, // taille d'un groupement de germes voronoi (nombre de germes par coté)
        };

        this._cache = {
            vor: new Cache2D({
                size: 4
            }),
            tile: new Cache2D({
                size: cache
            })
        };

        this._tileGenerator = new TileGenerator({
            seed,
            size: tileSize,
            cache,
            physicGridSize,
            names,
            scale
        });

        this._palette = [];
        this.options({
            palette
        });
    }

    /**
     * permet de changer quelques options
     * - taille des caches
     * - palette de couleur
     * @param options
     */
    options(options) {
        // cache de tiles
        if ('cache' in options) {
            this._cache.tile.size = options.cache;
        }
        if ('palette' in options) {
            const oPalette = {};
            options.palette.forEach(p => oPalette[p.altitude] = p.color);
            this._palette = Rainbow
                .gradient(oPalette)
                .map(x => Rainbow.parse(x))
                .map(x => x.r | x.g << 8 | x.b << 16 | 0xFF000000);
        }
    }




    /**
     * obtenir le seed défini en constructor
     * @returns {number}
     */
    get seed() {
        return this._masterSeed;
    }

    /**
     * getter de la fenetre de vue
     * @returns {View}
     */
    get view() {
        return this._view;
    }

    /**
     * getter des metrics
     * @returns {{voronoiCellSize: number, tileSize: number, voronoiClusterSize: number}}
     */
    get metrics() {
        return this._metrics;
    }

    /**
     * convertion d'unit rpe (entité) en rpt (tuile)
     * un tuile correspond à un certain nombre de pixel et c'est ce rapport qui est utilisé pour la conversion
     * @param n {number} composante de coordonnée exprimée en rpe
     * @returns {number} composante de coordonnée exprimée en rpt
     */
    rpe_rpt(n) { return Math.floor(n / this.metrics.tileSize); }

    /**
     * convertion d'unit rpt (tuile) en rpg (germe)
     * les germe sont espacé entre eux d'un certain nombre de tuile et c'est ce rapport qui est utilisé pour la conversion
     * @param n {number} composante de coordonnée exprimée en rpt
     * @returns {number} composante de coordonnée exprimée en rpg
     */
    rpt_rpg(n) { return Math.floor(n / this.metrics.voronoiCellSize); }

    /**
     * convertion d'unit" rpg (germe) en rpv (voronoi)
     * les secteur voronoi sont des ensemble 2D de germes et c'est le nombre de germes qui est utilisé pourt convertir
     * @param n {number} composante de coordonnée exprimée en rpg
     * @returns {number} composante de coordonnée exprimée en rpv
     */
    rpg_rpv(n) { return Math.floor(n / this.metrics.voronoiClusterSize); }

    // 3 fonnction de conversion inverse des 3 précédentes
    rpt_rpe(n) { return n * this.metrics.tileSize; }
    rpg_rpt(n) { return n * this.metrics.voronoiCellSize; }
    rpv_rpg(n) { return n * this.metrics.voronoiClusterSize; }

    // special
    rpt_rpv(n) { return Math.floor(n / (this.metrics.voronoiClusterSize * this.metrics.voronoiCellSize))}

    /**
     * Pour un germe donné, calcule la position réelle en ajoutant des offset aléatoire et des décalage
     * un ligne sur deux pour donner des motif heagonaux
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
     * @param x_rpv {number} coordonnées rpv du cluster
     * @param y_rpv {number}
     * @return {Voronoi}
     */
    computeVoronoiCluster(x_rpv, y_rpv) {
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
     * génération d'un continent avec le bruit de Perlin
     * @param map
     * @param size {number} taille de la cellule renfermant le continent
     * @param seed {number}
     * @returns {*}
     */
    computeContinentalPerlinNoise(map, size, seed) {
        this._rand.seed = seed;

        const wn = Tools2D.createArray2D(size, size, (x, y) => {
            // bruit initial
            const f = this._rand.rand();
            switch (seed % 7) {
                case 0: // les altitudes sont divisée par deux
                case 1: // les altitude sont convesifiées
                case 2: // les altitude sont convesifiées
                case 3: // les altitude sont convesifiées
                case 4:
                    return Math.sqrt(f);

                case 5: // les altitude sont concavifiées
                    return f * f;

                default:
                    return f;
            }
        });
        const pn = Perlin.generate(wn, 6);
        return map.map((row, y) => row.map((c, x) => pn[y][x] * c));
    }

    /**
     * Transforme un rectangle de dimension quelconque en carré (prend la plus grande dimension comme nouvelle dimension du carré)
     * @param w {number} largeur
     * @param h {number} hauteur
     * @private
     * @return {{xOfs, yOfs, size}} nouvelle taille (size) ainsi que les offset du rectangle dans le nouveau carré
     */
    static _resquare(w, h) {
        const size = Math.max(w, h);
        const xOfs = (size - w) >> 1;
        const yOfs = (size - h) >> 1;
        return {xOfs, yOfs, size};
    }

    /**
     * Calcule une height map associée à la cellule de voronoi spécifée
     * cette heightMap est la base du relief de l'île qui sera générée dans cette cellule
     */
    computeVoronoiHeightMap(x_rpv, y_rpv) {
        let oStructure = this._cache.vor.load(x_rpv, y_rpv);
        if (oStructure !== null) {
            return oStructure;
        }
        const vor = this.computeVoronoiCluster(x_rpv, y_rpv);
        const cells = [];
        const tiles = {};

        // récupérer la liste des rectangles
        vor
            .germs
            .filter(g => g.interior)
            .forEach((g, germIndex) => {
                const xStart = g.regions.inner[0].x;
                const yStart = g.regions.inner[0].y;
                const oSquare = WorldGenerator._resquare(g.regions.inner[1].x - xStart + 1, g.regions.inner[1].y - yStart + 1);
                const aMap = Tools2D.createArray2D(oSquare.size, oSquare.size, () => -1);
                const seed = pcghash(g.x, g.y, this.seed);
                const t0x = this.rpg_rpt(g.x);
                const t0y = this.rpg_rpt(g.y);


                g.points.forEach(p => {
                    const x_rpt = p.x;
                    const y_rpt = p.y;
                    const sx_rpt = x_rpt.toString();
                    const sy_rpt = y_rpt.toString();
                    if (!(sy_rpt in tiles)) {
                        tiles[sy_rpt] = {};
                    }
                    // coordonnée de la tuile dan s la heightMap locale
                    // les coordonnée doivent etre local au voronoi
                    const ox_rpt = x_rpt - xStart;
                    const oy_rpt = y_rpt - yStart;
                    aMap[oy_rpt][ox_rpt] = p.d;
                    tiles[sy_rpt][sx_rpt] = { // cette structure permet de retrouver facilement la height map
                        x: ox_rpt, // position relative de la tuile au voronoi
                        y: oy_rpt,
                        z: p.d,
                        cell: germIndex,
                        seed: pcghash(
                            t0x + ox_rpt,
                            t0y + oy_rpt,
                            this.seed
                        )
                    };


                });

                // il faut d'avoir avoir construit la map "aMap" avant de la perliniser
                const heightMap = this.computeContinentalPerlinNoise(aMap, oSquare.size, seed);

                // LAND CELL
                cells[germIndex] = {
                    x: g.x,
                    y: g.y,
                    size: oSquare.size, // taille de la cellule (pour le rendu de perlin)
                    offset: { // offset de la cellule voronoi à l'interieur de la cellule carrée du perlin
                        x: xStart,
                        y: yStart
                    },
                    heightMap,
                    seed // seed de base de cette cellule
                };
            });
        oStructure = {cells, tiles};
        this._cache.vor.store(x_rpv, y_rpv, oStructure);
        return oStructure;
    }


    /**
     * Extraction des donnée d'une tuile dans un voronoi cluster
     * @param vorCluster {Voronoi} cluster dans lequel se trouve la tuile
     * @param x_rpt {number} coordonnée X de la tuile
     * @param y_rpt {number} coordonnée Y de la tuile
     */
    getVoronoiTile(vorCluster, x_rpt, y_rpt) {
        const sx_rpt = x_rpt.toString();
        const sy_rpt = y_rpt.toString();
        const {cells, tiles} = vorCluster;
        const tileRow = tiles[sy_rpt];
        if (tileRow === undefined) {
            throw new Error('this t is not located in this voronoi cluster');
        }
        const tile = tileRow[sx_rpt];
        if (tile === undefined) {
            throw new Error('this t is not located in this voronoi cluster');
        }
        return tile;
    }

    _cellFilterMinMax(base, value) {
        if (base < 0.45) {
            return base * value;
        } else {
            return Math.max(0, Math.min(0.999, 1.666 * (base - value / 4)));
        }
    }

    computeTile(x_rpt, y_rpt) {
        let oTile = this._cache.tile.load(x_rpt, y_rpt);
        if (oTile) {
            return oTile;
        }
        // obtenir le cluster qui contient la tuile spécifée
        const x_rpv = this.rpt_rpv(x_rpt);
        const y_rpv = this.rpt_rpv(y_rpt);
        const vorCluster = this.computeVoronoiHeightMap(x_rpv, y_rpv);
        const cells = vorCluster.cells;

        // a partir du bruit généré par le t generator on adjoin l'altitude de la t
        const {heightMap, physicMap} = this._tileGenerator.generate(x_rpt, y_rpt, {
            noise: (xi_rpt, yi_rpt, aNoise) => {
                const oThisTile = this.getVoronoiTile(vorCluster, xi_rpt, yi_rpt);
                const hm = cells[oThisTile.cell].heightMap;
                const base = hm[oThisTile.y][oThisTile.x];
                Tools2D.walk2D(aNoise, (x, y, value) => this._cellFilterMinMax(base, value));
                return aNoise;
            }
        });

        // colorization
        const PALETTE = this._palette;
        const PALETTE_LENGTH = PALETTE.length;
        const colorMap = Tools2D.map2D(
            heightMap,
            (x, y, value) => value < 0 ? -1 : PALETTE[Math.min(PALETTE_LENGTH - 1, value * PALETTE_LENGTH | 0)]
        );

        oTile = {
            colorMap,
            physicMap,
            x: x_rpt,
            y: y_rpt,
            physicGridSize: this._physicGridSize
        };
        this._cache.tile.store(x_rpt, y_rpt, oTile);
        return oTile;
    }
}

export default WorldGenerator;
