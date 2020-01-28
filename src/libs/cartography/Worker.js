import Cartography from './Cartography';
import Webworkio from 'webworkio';
import Names from '../names';
import {fetchJSON} from'../fetch-json';

class Worker {
    async actionInit(options) {
        const palette = await fetchJSON(options.palette);
        const names = await fetchJSON(options.names);
        await Names.setLists({ towns: names });
        this._cartography = new Cartography({
            seed: options.seed,
            palette,
            cache: 256,
            tileSize: 128,
            vorCellSize: 25,
            vorClusterSize: 4
        });
    }

    actionOptions(options) {

    }

    constructor() {
        this._cartography = null;
        let wwio = new Webworkio();
        wwio.worker();

        wwio.on('init', async (options, cb) => {
            this.actionInit(options);
            cb(true);
        });

        wwio.on('options', (options) => {
            this._cartography.options(options);
        });

        wwio.on('tile', ({x, y}, cb) => {
            cb({ tile: this._cartography.computeTile(x, y) });
        });

        this._wwio = wwio;
    }
}

export default Worker;
