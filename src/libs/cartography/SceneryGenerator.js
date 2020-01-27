//import * as pf from '../../pattern-finder';
//import Names from '../../names';
import CanvasHelper from "../canvas-helper";

const PHYS_WATER = 11;
const PHYS_SHORE = 12;
const PHYS_COAST = 22;
const PHYS_PLAIN = 23;
const PHYS_FOREST = 33;
const PHYS_PEAK = 55;


const PATTERNS = {
    port: {
        size4east: [
            [PHYS_COAST, PHYS_COAST, PHYS_SHORE, PHYS_WATER],
            [PHYS_COAST, PHYS_COAST, PHYS_SHORE, PHYS_WATER],
            [PHYS_COAST, PHYS_COAST, PHYS_SHORE, PHYS_WATER],
            [PHYS_COAST, PHYS_COAST, PHYS_SHORE, PHYS_WATER],
        ],

        size4west: [
            [PHYS_WATER, PHYS_SHORE, PHYS_COAST, PHYS_COAST],
            [PHYS_WATER, PHYS_SHORE, PHYS_COAST, PHYS_COAST],
            [PHYS_WATER, PHYS_SHORE, PHYS_COAST, PHYS_COAST],
            [PHYS_WATER, PHYS_SHORE, PHYS_COAST, PHYS_COAST],
        ],

        size4south: [
            [PHYS_COAST, PHYS_COAST, PHYS_COAST, PHYS_COAST],
            [PHYS_COAST, PHYS_COAST, PHYS_COAST, PHYS_COAST],
            [PHYS_SHORE, PHYS_SHORE, PHYS_SHORE, PHYS_SHORE],
            [PHYS_WATER, PHYS_WATER, PHYS_WATER, PHYS_WATER],
        ],

        size4north: [
            [PHYS_WATER, PHYS_WATER, PHYS_WATER, PHYS_WATER],
            [PHYS_SHORE, PHYS_SHORE, PHYS_SHORE, PHYS_SHORE],
            [PHYS_COAST, PHYS_COAST, PHYS_COAST, PHYS_COAST],
            [PHYS_COAST, PHYS_COAST, PHYS_COAST, PHYS_COAST],
        ]
    }
};

const MESH_SIZE = 16;

/**
 * Construction des clipart utilisé pour égayer la map
 * @private
 */
function _buildCliparts() {
    let cliparts = {};
    const MESH_SIZE = 16;
    const WAVE_SIZE = 3;
    const HERB_SIZE = 3;
    const HOUSE_SIZE = 5;
    const MNT_LENGTH = 7;
    const MNT_HEIGHT = MNT_LENGTH | 0.75 | 0;
    const FOREST_SIZE = 4;
    let xMesh = MESH_SIZE >> 1;
    let yMesh = MESH_SIZE >> 1;
    let c, ctx;

    // vague
    c = CanvasHelper.create(MESH_SIZE, MESH_SIZE);
    ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(57, 25, 7, 0.2)';
    ctx.strokeStyle = 'rgba(154, 117, 61, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xMesh - WAVE_SIZE, yMesh + WAVE_SIZE);
    ctx.lineTo(xMesh, yMesh);
    ctx.lineTo(xMesh + WAVE_SIZE, yMesh + WAVE_SIZE);
    ctx.stroke();
    cliparts.wave = c;

    // forest
    c = CanvasHelper.create(MESH_SIZE, MESH_SIZE);
    ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(57, 25, 7, 0.2)';
    ctx.strokeStyle = 'rgba(154, 117, 61, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(xMesh, yMesh,FOREST_SIZE, 0, Math.PI * 2);
    ctx.rect(xMesh - 1, yMesh + FOREST_SIZE, 2, FOREST_SIZE);
    ctx.fill();
    ctx.stroke();
    cliparts.forest = c;

    // herbe
    c = CanvasHelper.create(MESH_SIZE, MESH_SIZE);
    ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(57, 25, 7, 0.2)';
    ctx.strokeStyle = 'rgba(154, 117, 61, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xMesh - HERB_SIZE, yMesh - HERB_SIZE);
    ctx.lineTo(xMesh, yMesh);
    ctx.lineTo(xMesh + HERB_SIZE, yMesh - HERB_SIZE);
    ctx.stroke();
    cliparts.grass = c;

    // Montagne
    c = CanvasHelper.create(MESH_SIZE, MESH_SIZE);
    ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(57, 25, 7, 0.2)';
    ctx.strokeStyle = 'rgba(154, 117, 61, 0.75)';
    ctx.lineWidth = 1.2;
    let g = ctx.createLinearGradient(xMesh, 0, MESH_SIZE, MESH_SIZE);
    g.addColorStop(0, 'rgba(154, 117, 61, 1)');
    g.addColorStop(1, 'rgba(154, 117, 61, 0.5)');
    ctx.fillStyle = g;
    ctx.moveTo(xMesh, yMesh);
    ctx.beginPath();
    ctx.lineTo(xMesh + MNT_LENGTH, yMesh + MNT_HEIGHT);
    ctx.lineTo(xMesh, yMesh + (MNT_HEIGHT * 0.75 | 0));
    ctx.lineTo(xMesh + (MNT_LENGTH * 0.25 | 0), yMesh + (MNT_HEIGHT * 0.4 | 0));
    ctx.lineTo(xMesh, yMesh);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(xMesh, yMesh);
    ctx.lineTo(xMesh + MNT_LENGTH, yMesh + MNT_HEIGHT);
    ctx.moveTo(xMesh, yMesh);
    ctx.lineTo(xMesh, yMesh + (MNT_HEIGHT >> 1));
    ctx.moveTo(xMesh, yMesh);
    ctx.lineTo(xMesh - MNT_LENGTH, yMesh + MNT_HEIGHT);
    ctx.stroke();
    cliparts.mount = c;


    // Maison
    c = CanvasHelper.create(MESH_SIZE, MESH_SIZE);
    ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(57, 25, 7, 0.6)';
    ctx.strokeStyle = 'rgba(154, 117, 61, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xMesh - HOUSE_SIZE + 2, yMesh + HOUSE_SIZE);
    ctx.lineTo(xMesh - HOUSE_SIZE + 2, yMesh);
    ctx.lineTo(xMesh - HOUSE_SIZE, yMesh);
    ctx.lineTo(xMesh , yMesh - HOUSE_SIZE);
    ctx.lineTo(xMesh + HOUSE_SIZE, yMesh);
    ctx.lineTo(xMesh + HOUSE_SIZE - 2, yMesh);
    ctx.lineTo(xMesh + HOUSE_SIZE - 2, yMesh + HOUSE_SIZE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    cliparts.house = c;
    return cliparts;
}

const CLIPARTS = _buildCliparts();




class SceneryGenerator {

}

export default SceneryGenerator;