console.log('borrow_checker');

class ObjectProxy {
    constructor(object) {
        this._object = object;
        this._ref = 0;
        this._mut = false;
        this._moved = false;
    }

    with_ref(handler) {
        if (this._mut || this._moved) {
            throw Error('Cannot get ref');
        }
        this._ref += 1;
        this._object = handler(this._object);
        this._ref -= 1;
    }

    with_mut(handler) {
        if (this._mut || this._ref != 0 || this._moved) {
            throw Error('Cannot get mut');
        }
        this._mut = true;
        this._object = handler(this._object);
        this._mut = false;
    }

    with_move(handler) {
        if (this._mut || this._ref != 0 || this._moved) {
            throw Error('Cannot move');
        }
        this._moved = true;
        handler(this._object);
    }
}

let n = new ObjectProxy(42);
n.with_ref(num => {
    console.log('The answer is ' + num.toString() + '.');
    return num;
});
n.with_mut(num => {
    num += 1;
    return num;
});
n.with_move(num => {
    console.log('Now it is ' + num.toString() + '.');
});
try {
    n.with_ref(num => num);
} catch (err) {
    console.log(err);
}