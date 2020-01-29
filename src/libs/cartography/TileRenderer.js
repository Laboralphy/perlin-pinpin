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
        scale = 1
    }) {
        this._brushes = {};
        this._scale = scale;
    }



    /**
     * Chargement des sceneries
     */
    async loadBrushes(brushes) {
        // brushes
        for (let i = 0, l = brushes.length; i < l; ++i) {
            const s = brushes[i];
            if (s.type === 'brush') {
                this._brushes[s.code] = await ImageLoader.load(s.src);
            }
        }
        console.log('brushes', brushes, this._brushes);
        return this._brushes;
    }

    render(oTileData, cvs = null) {
        const {colorMap, physicMap, physicGridSize} = oTileData;
        if (!cvs) {
            const size = colorMap.length;
            cvs = CanvasHelper.createCanvas(size, size)
        }
        const ctx = cvs.getContext('2d');
        PixelProcessor.process(cvs, pp => {
            const nColor = colorMap[pp.y][pp.x];
            let oColor = Rainbow.parse(nColor);
            pp.color.r = oColor.r;
            pp.color.g = oColor.g;
            pp.color.b = oColor.b;
            pp.color.a = oColor.a;
        });
        if (this._scale !== 1) {
            cvs = CanvasHelper.cloneCanvas(cvs, this._scale);
        }
        // ajout des brushes
        physicMap.forEach((row, y) => row.forEach((cell, x) => {
            if ((x & 1) === (y & 1)) {
                const sScen = cell;
                if (sScen in this._brushes) {
                    ctx.drawImage(this._brushes[sScen], x * physicGridSize, y * physicGridSize);
                }
            }
        }));
        return cvs;
    }
}

export default TileRenderer;