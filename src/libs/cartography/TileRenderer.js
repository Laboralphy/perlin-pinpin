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

const COORDS_FONT_DEFINITION = 'italic 13px Times New Roman';
const MESH_SIZE = 16;
const FONT_SIZE = 28;
const FONT_PAD = 4;
const CITY_FONT_DEFINITION = 'px bold Times New Roman';

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
            const type = s.type;
            if (!(type in this._brushes)) {
                this._brushes[type] = {};
            }
            this._brushes[type][s.code] = {
                img: await ImageLoader.load(s.src),
                ...s
            };
        }
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
            ctx.font = COORDS_FONT_DEFINITION;
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

    setCityNameFont(ctx, nFontSize) {
        ctx.textBaseline = 'top';
        ctx.strokeStyle = '#efce8c';
        ctx.fillStyle = 'rgba(57, 25, 7)';
        ctx.font = nFontSize + CITY_FONT_DEFINITION;
    }


    drawCity(oCanvas, data, physicGridSize) {
        console.log('drawing city', data);
        const {x, y, width, height, name, seed, dir} = data;
        let nFontSize = FONT_SIZE;
        if (name.length > 10) {
            nFontSize *= 0.8;
        }
        const ctx = oCanvas.getContext('2d');
        const xm = x * physicGridSize, ym = y * physicGridSize;
        const wm = width * physicGridSize;
        const hm = height * physicGridSize;

        const sOrient = dir === 'n' || dir === 's'
            ? 'ns'
            : 'ew';

        const cities = Object.values(this._brushes.city).filter(b => b.orientation === sOrient);
        const city = cities[Math.abs(seed) % cities.length];
        switch (dir) {
            case 'w':
                ctx.drawImage(city.img , xm + physicGridSize, ym);
                break;

            case 'e':
                ctx.drawImage(city.img, xm, ym);
                break;

            case 'n':
                ctx.drawImage(city.img, xm, ym + physicGridSize);
                break;

            case 's':
                ctx.drawImage(city.img, xm, ym);
                break;

            default:
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(xm, ym, wm, hm);
        }

        this.setCityNameFont(ctx, nFontSize);
        // déterminer si le nom de la ville sera en haut ou en bas
        let xf = xm, yf = ym;
        if (yf - FONT_SIZE - FONT_PAD < 0) {
            yf = yf + hm + 4;
        } else {
            yf -= FONT_SIZE + FONT_PAD;
        }
        const wt = ctx.measureText(name).width;
        if (xf + wt >= oCanvas.width) {
            xf = oCanvas.width - wt - 1;
        }
        ctx.strokeText(name, xf, yf);
        ctx.fillText(name, xf, yf);
    }



    paintSceneries(oCanvas, data, physicGridSize) {
        console.log(data);
        data.forEach(d => {
            switch (d.type) {
                case 'city':
                    this.drawCity(oCanvas, d, physicGridSize);
                    break;
            }
        });
    }


    render(oTileData, cvs) {
        const {colorMap, physicMap, sceneries, physicGridSize} = oTileData;
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
        const oLandBrushes = this._brushes.land;
        physicMap.forEach((row, y) => row.forEach((cell, x) => {
            if ((x & 1) === (y & 1)) {
                const sScen = cell;
                if (sScen in oLandBrushes) {
                    ctx.drawImage(oLandBrushes[sScen].img, x * physicGridSize, y * physicGridSize);
                }
            }
        }));
        // ajout des sceneries

        this.paintLinesCoordinates(cvs, oTileData.x, oTileData.y);
        this.paintSceneries(cvs, sceneries, physicGridSize);
        return cvs;
    }
}

export default TileRenderer;