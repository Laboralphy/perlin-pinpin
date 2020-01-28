import Webworkio from 'webworkio';
import {mod} from '../r-mod';
import {View, Vector} from '../geometry';
import Cache2D from "../cache2d";
import CanvasHelper from "../canvas-helper";
import TileRenderer from "./TileRenderer";
import {fetchJSON} from '../fetch-json';

class Service {

    constructor({
        worker,     // url du service
        brushes,     // chemin des sceneries
        seed = 0, // graine aléatoire
        cellSize = 25, // taille des cellules voronoi (continents)
        tileSize = 128, // taille des tuile de la carte
        palette,    // palette de couleurs
        cache = 64, // taille du cache de tuiles
        preload = 2, // nombre de tuile a précharger autour de la zone de vue
        progress = null, // fonction callback appelée quand les tuiles se chargent
        names // nom des villes
    }) {
        this._worldDef = {
            worker,
            seed,
            cellSize,
            tileSize,
            palette,
            cache,
            preload,
            progress,
            brushes,
            names
        };
        this._view = new Vector();
        this._cache = new Cache2D({
            size: cache
        });
        this._tr = new TileRenderer({
            size: tileSize
        });
        this._fetching = false;
    }

    async loadBrushes() {
        return this._tr.loadBrushes(await fetchJSON(this._worldDef.brushes));
    }

    async start() {
        const wgd = this._worldDef;
        this.log('starting service');
        await this._tr.loadBrushes(wgd.brushes);
        this.log('brushes loaded');
        return new Promise((resolve, reject) => {
            this._wwio = new Webworkio();
            this._wwio.worker(wgd.worker);
            this._wwio.emit('init', {
                seed: wgd.seed,
                vorCellSize: wgd.cellSize,
                vorClusterSize: 4,
                tileSize: wgd.tileSize,
                palette: wgd.palette,
                cache: wgd.cache,
                names: wgd.names
            }, status => {
                this.log('service started with status :', status);
                resolve(status);
            });
        });
    }

    terminate() {
        this._wwio.terminate();
        this.log('service terminated');
    }

    progress(n100) {
        this.log('progress', n100);
        if (typeof this._worldDef.progress === 'function') {
            this._worldDef.progress(n100);
        }
    }

    log(...args) {
        console.log(...args);
    }

    adjustCacheSize(w, h) {
        return new Promise(resolve => {
            let cellSize = this._worldDef.tileSize;
            let m = Service.getViewPointMetrics(this._view.x, this._view.y, w, h, cellSize, this._worldDef.preload);
            let nNewSize = (m.yTo - m.yFrom + 2) * (m.xTo - m.xFrom + 2) * 2;
            if (nNewSize !== this._worldDef.cache) {
                this._worldDef.cache = nNewSize;
                this._cache.size = nNewSize;
                /*this._wwio.emit('options', {
                    cacheSize: nNewSize
                }, () => resolve(true));*/
                this.log('using canvas ( width', w, ', height', h, ') view', m, 'adjusting cache size :', nNewSize);
            } else {
                resolve(true);
            }
        });
    }

    /**
     * A partir d'une coordonée centrée sur un rectangle de longueur et largeur spécifiées
     * determiner les différente coordonnée de tuiles à calculer
     * @param x {number} coordonnée du centre du view point
     * @param y {number}
     * @param width {number} taille du viewpoint
     * @param height {number}
     * @param cellSize {number} taille d'une tile
     * @param nBorder {number} taille de la bordure de securité
     * @return {{xFrom: number, yFrom: number, xTo: *, yTo: *, xOfs: number, yOfs: number}}
     */
    static getViewPointMetrics(x, y, width, height, cellSize, nBorder) {
        let x0 = x - (width >> 1);
        let y0 = y - (height >> 1);
        let xFrom = Math.floor(x0 / cellSize) - nBorder;
        let yFrom = Math.floor(y0 / cellSize) - nBorder;
        let xTo = Math.floor((x0 + width - 1) / cellSize) + nBorder;
        let yTo = Math.floor((y0 + height - 1) / cellSize) + nBorder;
        let xOfs = mod(x0, cellSize);
        let yOfs = mod(y0, cellSize);
        return {
            xFrom,
            yFrom,
            xTo,
            yTo,
            xOfs: -xOfs - nBorder * cellSize,
            yOfs: -yOfs - nBorder * cellSize
        };
    }



    async fetchTile(x, y) {
        return new Promise(resolve => {
            // verification en cache
            const tileSize = this._worldDef.tileSize;
            let oTile = CanvasHelper.createCanvas(tileSize, tileSize);
            oTile.setAttribute('data-painted', '0');
            this._cache.store(x, y, oTile);
            this._wwio.emit('tile', {x, y}, result => {
                this._tr.render(result);
                oTile.setAttribute('data-painted', '1');
                resolve(oTile);
            });
        });
    }

    async preloadTiles(x, y, w, h) {
        let tStart = performance.now();
        let cellSize = this._worldDef.cellSize;
        let m = Service.getViewPointMetrics(x, y, w, h, cellSize, this._worldDef.preload);
        let yTilePix = 0;
        let nTileCount = (m.yTo - m.yFrom + 1) * (m.xTo - m.xFrom + 1);
        let iTile = 0;
        let nTileFetched = 0;
        let n100;
        for (let yTile = m.yFrom; yTile <= m.yTo; ++yTile) {
            let xTilePix = 0;
            for (let xTile = m.xFrom; xTile <= m.xTo; ++xTile) {
                let wt = this._cache.load(xTile, yTile);
                if (!wt) {
                    // pas encore créée
                    n100 = (100 * iTile / nTileCount | 0);
                    this.progress(n100);
                    ++nTileFetched;
                    wt = await this.fetchTile(xTile, yTile);
                }
                // si la tile est partiellement visible il faut la dessiner
                xTilePix += cellSize;
                ++iTile;
            }
            yTilePix += cellSize;
        }
        if (nTileFetched) {
            n100 = 100;
            this.progress(n100);
        }
        return {
            tileFetched: nTileFetched,
            timeElapsed: (performance.now() - tStart | 0) / 1000
        };
    }


    /**
     *
     * @param oCanvas
     * @param vView
     * @param bRender {boolean} if true, then the tiles are rendered after preload
     * @return {Promise<boolean>} returns true if no preload was currently running, returns false if there is a preload currently runing
     */
    view(oCanvas, vView, bRender = false) {
        this._viewedCanvas = oCanvas;
        this._viewedPosition = vView;
        let x = Math.round(vView.x);
        let y = Math.round(vView.y);
        this.adjustCacheSize(oCanvas.width, oCanvas.height);
        if (!this._fetching) {
            this._fetching = true;
            this.preloadTiles(x, y, oCanvas.width, oCanvas.height).then(({tileFetched, timeElapsed}) => {
                this._fetching = false;
                if (tileFetched) {
                    this.log('fetched', tileFetched, 'tiles in', timeElapsed, 's.', (tileFetched * 10 / timeElapsed | 0) / 10, 'tiles/s');
                }
                if (bRender) {
                    this.renderTiles();
                }
            });
        }
        this._view.set(x - (oCanvas.width >> 1), y - (oCanvas.height >> 1));
    }


    renderTiles() {
        if (!this._viewedCanvas) {
            throw new Error('view() has not been called');
        }
        const oCanvas = this._viewedCanvas, x = this._viewedPosition.x, y = this._viewedPosition.y;
        let w = oCanvas.width;
        let h = oCanvas.height;
        let cellSize = this._worldDef.cellSize;
        let m = Service.getViewPointMetrics(x, y, w, h, cellSize, 0);
        let yTilePix = 0;
        let ctx = oCanvas.getContext('2d');
        for (let yTile = m.yFrom; yTile <= m.yTo; ++yTile) {
            let xTilePix = 0;
            for (let xTile = m.xFrom; xTile <= m.xTo; ++xTile) {
                let wt = this._cache.load(xTile, yTile);
                if (wt) {
                    let xScreen = m.xOfs + xTilePix;
                    let yScreen = m.yOfs + yTilePix;
                    if (wt.getAttribute('data-painted') === '1') {
                        ctx.drawImage(wt, xScreen, yScreen);
                    }
                }
                xTilePix += cellSize;
            }
            yTilePix += cellSize;
        }
    }
}

export default Service;