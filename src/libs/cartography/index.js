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
        tileSize, // taille des tuile de la carte
        palette,    // palette de couleurs
        cache = 64, // taille du cache de tuiles
        preload = 0, // nombre de tuile a précharger autour de la zone de vue
        progress = null, // fonction callback appelée quand les tuiles se chargent
        scale = 1,  // zoom de tuiles
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
            scale,
            names
        };
        this._view = new Vector();
        this._cache = new Cache2D({
            size: cache
        });
        this._tr = new TileRenderer();
        this._fetching = false;
    }

    get fetching() {
        return this._fetching;
    }

    async loadBrushes(sURL) {
        return this._tr.loadBrushes(await fetchJSON(sURL));
    }

    checkResponse(response, resolve, reject) {
        if (response.status === 'error') {
            reject(new Error('web worker error: ' + response.error));
        } else {
            resolve(response);
        }
    }

    async start() {
        const wgd = this._worldDef;
        this.log('starting service');
        await this.loadBrushes(wgd.brushes);
        this.log('brushes loaded');
        return new Promise((resolve, reject) => {
            this._wwio = new Webworkio();
            this._wwio.worker(wgd.worker);
            this.log('web worker instance created', wgd.worker);
            this._wwio.emit('init', {
                seed: wgd.seed,
                vorCellSize: wgd.cellSize,
                vorClusterSize: 4,
                tileSize: wgd.tileSize,
                palette: wgd.palette,
                cache: wgd.cache,
                names: wgd.names,
                scale: wgd.scale
            }, response => {
                this.checkResponse(response, resolve, reject);
            });
        });
    }

    terminate() {
        this._wwio.terminate();
        this.log('service terminated');
    }

    progress(n100) {
        this.log('progress', n100 + '%');
        if (typeof this._worldDef.progress === 'function') {
            this._worldDef.progress(n100);
        }
    }

    log(...args) {
        console.log(...args);
    }

    adjustCacheSize(w, h) {
        return new Promise(resolve => {
            let tileSize = this._worldDef.tileSize;
            let m = Service.getViewPointMetrics(this._view.x, this._view.y, w, h, tileSize, this._worldDef.preload);
            let nNewSize = (m.yTo - m.yFrom + 2) * (m.xTo - m.xFrom + 2) * 2;
            if (nNewSize !== this._worldDef.cache) {
                this._worldDef.cache = nNewSize;
                this._cache.size = nNewSize;
                this._wwio.emit('options', {
                    cacheSize: nNewSize
                }, () => resolve(true));
                this.log('using canvas ( width', w, ', height', h, ')', 'adjusting cache size :', nNewSize);
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
     * @param tileSize {number} taille d'une tile
     * @param nBorder {number} taille de la bordure de securité
     * @return {{xFrom: number, yFrom: number, xTo: *, yTo: *, xOfs: number, yOfs: number}}
     */
    static getViewPointMetrics(x, y, width, height, tileSize, nBorder) {
        const x0 = x - (width >> 1);
        const y0 = y - (height >> 1);
        const xFrom = Math.floor(x0 / tileSize) - nBorder;
        const yFrom = Math.floor(y0 / tileSize) - nBorder;
        const xTo = Math.floor((x0 + width - 1) / tileSize) + nBorder;
        const yTo = Math.floor((y0 + height - 1) / tileSize) + nBorder;
        const xOfs = mod(x0, tileSize);
        const yOfs = mod(y0, tileSize);
        return {
            xFrom,
            yFrom,
            xTo,
            yTo,
            xOfs: -xOfs - nBorder * tileSize,
            yOfs: -yOfs - nBorder * tileSize
        };
    }

    async fetchTile(x, y) {
        return new Promise(resolve => {
            // verification en cache
            let oTile = CanvasHelper.createCanvas(
                this._worldDef.tileSize,
                this._worldDef.tileSize
            );
            oTile.setAttribute('data-painted', '0');
            this._cache.store(x, y, oTile);
            this._wwio.emit('tile', {x, y}, result => {
                this._tr.render(result, oTile);
                oTile.setAttribute('data-painted', '1');
                resolve(oTile);
            });
        });
    }

    async preloadTiles(x, y, w, h) {
        let tStart = performance.now();
        let tileSize = this._worldDef.tileSize;
        let m = Service.getViewPointMetrics(x, y, w, h, tileSize, this._worldDef.preload);
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
                xTilePix += tileSize;
                ++iTile;
            }
            yTilePix += tileSize;
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
                if (tileFetched > 0) {
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
        let tileSize = this._worldDef.tileSize;
        let m = Service.getViewPointMetrics(x, y, w, h, tileSize, 0);
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
                xTilePix += tileSize;
            }
            yTilePix += tileSize;
        }
    }
}

export default Service;