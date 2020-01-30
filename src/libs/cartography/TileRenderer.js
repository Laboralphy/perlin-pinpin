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

const FONT_DEFINITION = 'italic 13px Times New Roman';

class TileRenderer {
    constructor() {
        this._brushes = {};
        this._drawGrid = true;
        this._drawCoords = true;
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

    paintLinesCoordinates(tile, xCurs, yCurs) {
        let ctx = tile.getContext('2d');
        if (this._drawGrid) {
            ctx.strokeStyle = 'rgba(57, 25, 7, 0.5)';
            ctx.beginPath();
            ctx.moveTo(0, tile.height - 1);
            ctx.lineTo(0, 0);
            ctx.lineTo(tile.width - 1, 0);
            ctx.stroke();
        }
        if (this._drawCoords) {
            let sText;
            ctx.font = FONT_DEFINITION;
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#efce8c';
            ctx.fillStyle = 'rgba(57, 25, 7)';
            sText = 'lat:  ' + yCurs.toString();
            ctx.strokeText(sText, 25, 4);
            ctx.fillText(sText, 25, 4);
            sText = 'long:  ' + xCurs.toString();
            ctx.save();
            ctx.rotate(-Math.PI / 2);
            ctx.strokeText(sText, -tile.width + 25, 4);
            ctx.fillText(sText, -tile.width + 25, 4);
            ctx.restore();
        }
    }


    render(oTileData, cvs) {
        const {colorMap, physicMap, physicGridSize} = oTileData;
        const cvsColor = CanvasHelper.createCanvas(colorMap.length, colorMap.length);
        PixelProcessor.process(cvsColor, pp => {
            const nColor = colorMap[pp.y][pp.x];
            let oColor = Rainbow.parse(nColor);
            pp.color.r = oColor.r;
            pp.color.g = oColor.g;
            pp.color.b = oColor.b;
            pp.color.a = oColor.a;
        });
        // ajout des brushes
        const ctx = cvs.getContext('2d');
        ctx.drawImage(cvsColor, 0, 0, cvsColor.width, cvsColor.height, 0, 0, cvs.width, cvs.height);
        physicMap.forEach((row, y) => row.forEach((cell, x) => {
            if ((x & 1) === (y & 1)) {
                const sScen = cell;
                if (sScen in this._brushes) {
                    ctx.drawImage(this._brushes[sScen], x * physicGridSize, y * physicGridSize);
                }
            }
        }));
        this.paintLinesCoordinates(cvs, oTileData.x, oTileData.y);
        return cvs;
    }
}

export default TileRenderer;