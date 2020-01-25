import Cache2D from "../cache2d";
import * as Tools2D from "../tools2d";
import Random from "../random";
import Perlin from "../perlin";

class TileGenerator {

    constructor () {
        this._cache = {
            wn: new Cache2D(),
            pn: new Cache2D()
        };
        this._rand = new Random();
        this._size = 128;
        this._octaves = 8;
        this._seed = 0;
    }

    get rand() {
        return this._rand;
    }

    set rand(value) {
        this._rand = value;
    }

    get size() {
        return this._size;
    }

    set size(value) {
        this._size = value;
    }

    get octaves() {
        return this._octaves;
    }

    set octaves(value) {
        this._octaves = value;
    }

    get seed() {
        return this._seed;
    }

    set seed(value) {
        this._seed = value;
    }

    /**
     * creation du hash d'une seule valeur
     * @param a {number}
     * @returns {number}
     */
    static hash (a) {
        if (a < 0) {
            let b = 0, h = TileGenerator.hash(-a);
            while (h) {
                b = (b << 4) | h & 15;
                h >>= 4;
            }
            return Math.abs(b);
        }
        a = (a ^ 61) ^ (a >> 16);
        a = a + (a << 3);
        a = a ^ (a >> 4);
        a = a * 0x27d4eb2d;
        a = a ^ (a >> 15);
        return a;
    }

    generateWhiteNoise() {
        const rand = this._rand;
        return Tools2D.createArray2D(this._size, this._size, () => rand.rand());
    }

    /**
     * Calcule le hash d'une région
     * Permet de choisir une graine aléatoire
     * et de raccorder seamlessly les région adjacente
     */
    static getPointHash(x, y) {
        let xh = TileGenerator.hash(x).toString().split('');
        let yh = TileGenerator.hash(y).toString().split('');
        let s = xh.shift() + yh.shift() + '.';
        while (xh.length || yh.length) {
            if (xh.length) {
                s += xh.shift();
            }
            if (yh.length) {
                s += yh.shift();
            }
        }
        return parseFloat(s);
    }

    generate(x, y, callbacks) {
        if (x >= Number.MAX_SAFE_INTEGER || x <= -Number.MAX_SAFE_INTEGER || y >= Number.MAX_SAFE_INTEGER || y <= -Number.MAX_SAFE_INTEGER) {
            throw new Error('trying to generate x:' + x + ' - y:' + y + ' - maximum safe integer is ' + Number.MAX_SAFE_INTEGER + ' !');
        }
        callbacks = callbacks || {};
        const perlin = 'perlin' in callbacks ? callbacks.perlin : null;
        const noise = 'noise' in callbacks ? callbacks.noise : null;
        const rand = this._rand;

        const cached = this._cache.pn.load(x, y);
        if (cached) {
            return cached;
        }
        let wnCache = this._cache.wn;

        const gwn = (xg, yg) => {
            let cachedNoise = wnCache.load(xg, yg);
            if (cachedNoise) {
                return cachedNoise;
            }
            let nSeed = TileGenerator.getPointHash(xg, yg);
            rand.seed = nSeed + this._seed;
            let aNoise = this.generateWhiteNoise();
            if (noise) {
                aNoise = noise(xg, yg, aNoise);
            }
            wnCache.store(xg, yg, aNoise);
            return aNoise;
        };

        const merge33 = a33 => {
            let h = this._size;
            let a = [];
            let i = 0;
            for (let y, ya = 0; ya < 3; ++ya) {
                let a33ya = a33[ya];
                let a33ya0 = a33ya[0];
                let a33ya1 = a33ya[1];
                let a33ya2 = a33ya[2];
                for (y = 0; y < h; ++y) {
                    a[i++] = a33ya0[y].concat(a33ya1[y], a33ya2[y]);
                }
            }
            return a;
        };

        const extract33 = a => {
            let s = this._size;
            return a.slice(s, s << 1).map(r => r.slice(s, s << 1));
        };

        let a0 = [
            [gwn(x - 1, y - 1), gwn(x, y - 1), gwn(x + 1, y - 1)],
            [gwn(x - 1, y), gwn(x, y), gwn(x + 1, y)],
            [gwn(x - 1, y + 1), gwn(x, y + 1), gwn(x + 1, y + 1)]
        ];

        let a1 = merge33(a0);
        let a2 = Perlin.generate(a1, this._octaves);
        let a3 = extract33(a2);
        if (perlin) {
            a3 = perlin(x, y, a3);
        }
        this._cache.pn.store(x, y, a3);
        return a3;
    }
}

export default TileGenerator;