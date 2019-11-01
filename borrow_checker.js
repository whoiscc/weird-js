console.log('borrow_checker');

class ObjectProxy {
    constructor(object) {
        this._object = object;
        this._ref = 0;
        this._mut = false;
        this._moved = false;
    }

    with_ref(handler) {
        this.inc_ref();
        this._object = handler(this._object);
        this.dec_ref();
    }

    with_mut(handler) {
        this.create_mut();
        this._object = handler(this._object);
        this.destroy_mut();
    }

    with_move(handler) {
        this.set_moved();
        handler(this._object);
    }

    as_ref() {
        return new ObjectRef(this);
    }

    as_mut() {
        return new ObjectMut(this);
    }

    move() {
        return new ObjectMove(this);
    }

    inc_ref() {
        if (this._mut || this._moved) {
            throw new Error('Cannot get ref');
        }
        this._ref += 1;
    }

    dec_ref() {
        if (this._ref == 0) {
            throw new Error('No ref left');
        }
        this._ref -= 1;
    }

    create_mut() {
        if (this._ref != 0 || this._mut || this._moved) {
            throw new Error('Cannot get mut');
        }
        this._mut = true;
    }

    destroy_mut() {
        if (!this._mut) {
            throw new Error('No mut created');
        }
        this._mut = false;
    }

    set_moved() {
        if (this._ref != 0 || this._mut || this._moved) {
            throw new Error('Cannot move');
        }
        this._moved = true;
    }
}

class ObjectRef {
    constructor(proxy) {
        this.proxy = proxy;
    }

    enter() {
        this.proxy.inc_ref();
    }

    exit() {
        this.proxy.dec_ref();
    }
}

class ObjectMut {
    constructor(proxy) {
        this.proxy = proxy;
    }

    enter() {
        this.proxy.create_mut();
    }

    exit() {
        this.proxy.destroy_mut();
    }
}

class ObjectMove {
    constructor(proxy) {
        this.proxy = proxy;
    }

    enter() {
        this.proxy.set_moved();
    }

    exit() {
        //
    }
}

function wrap(func) {
    return function () {
        for (arg of arguments) {
            arg.enter();
        }
        const result = func(...arguments);
        for (arg of arguments) {
            arg.exit();
        }
        return result;
    }
}

const n = new ObjectProxy(42);
wrap((a, b) => {
    console.log(a, b);
})(n.as_ref(), n.as_ref());
try {
    wrap((a, b) => {
        console.log(a, b);
    })(n.as_ref(), n.as_mut());
} catch (err) {
    console.log(err);
}