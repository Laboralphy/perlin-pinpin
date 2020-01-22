import Random from '../random';

class PearsonHash {
    constructor (rnd = undefined) {
        this._random = !!rnd ? rnd : new Random();
    }

    seed(n) {
        this._random.seed = n;
        this._table = this
            ._random
            .shuffle(
                [...new Array(256)]
                    .map((_, i) => i)
            );
    }

    hash8(message) {
        const table = this._table;
        return message.split('').reduce((hash, c) => {
            return table[(hash + c.charCodeAt(0)) % (table.length - 1)]
        }, message.length % (table.length - 1))
    }
}

export default PearsonHash;