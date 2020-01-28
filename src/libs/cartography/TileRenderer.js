/**
 * A partir des donnée d'une tuile, créé un canvas et ajoute des information visuel, et paysagique
 */
import CanvasHelper from "../canvas-helper";
import PixelProcessor from "../pixel-processor";
import Rainbow from "../rainbow";
import ImageLoader from "../image-loader";

const PHYS_WATER = 11;
const PHYS_SHORE = 12;
const PHYS_COAST = 22;
const PHYS_PLAIN = 23;
const PHYS_FOREST = 33;
const PHYS_PEAK = 55;

class TileRenderer {
    constructor({
        size
    }) {
        this._canvas = CanvasHelper.createCanvas(size, size);
        this._sceneries = {};
    }

    /**
     * Chargement des sceneries
     */
    async loadSceneries(sceneries) {
        this._sceneries = await ImageLoader.load(sceneries);
        return this._sceneries;
    }

    get canvas () {
        return this._canvas;
    }

    render(oTileData) {
        const {colorMap, physicMap, physicGridSize} = oTileData;
        const cvs = this._canvas;
        const ctx = cvs.getContext('2d');
        PixelProcessor.process(cvs, pp => {
            const nColor = colorMap[pp.y][pp.x];
            let oColor = Rainbow.parse(nColor);
            pp.color.r = oColor.r;
            pp.color.g = oColor.g;
            pp.color.b = oColor.b;
            pp.color.a = oColor.a;
        });
        // ajout des brushes
        physicMap.forEach((row, y) => row.forEach((cell, x) => {
            if ((x & 1) === (y & 1)) {
                const sScen = 's' + cell;
                if (sScen in this._sceneries) {
                    ctx.drawImage(this._sceneries[sScen], x * physicGridSize, y * physicGridSize);
                }
            }
        }));
    }
}

export default TileRenderer;