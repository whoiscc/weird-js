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
            throw new Error('Cannot get ref');
        }
        this._ref += 1;
        try {
            handler(new ObjectRef(this));
        } finally {
            if (this._ref == 0) {
                throw new Error('No ref left');
            }
            this._ref -= 1;    
        }
    }

    with_mut(handler) {
        if (this._ref != 0 || this._mut || this._moved) {
            throw new Error('Cannot get mut');
        }
        this._mut = true;
        try {
            handler(new ObjectMut(this));
        } finally {
            if (!this._mut) {
                throw new Error('No mut created');
            }
            this._mut = false;    
        }
    }

    move() {
        if (this._ref != 0 || this._mut || this._moved) {
            throw new Error('Cannot move');
        }
        this._moved = true;
        return new ObjectProxy(this._object);
    }

    _capture_ref(handler) {
        handler(this._object);
    }

    _capture_mut(handler) {
        this._object = handler(this._object);
    }
}

class ObjectRef {
    constructor(proxy) {
        this._proxy = proxy;
    }

    capture(handler) {
        this._proxy._capture_ref(handler);
    }
}

class ObjectMut {
    constructor(proxy) {
        this._proxy = proxy;
    }

    capture(handler) {
        this._proxy._capture_mut(handler);
    }
}

const n = new ObjectProxy(42);
n.with_ref(ref_n => {
    ref_n.capture(num => {
        console.log('The number is ' + num.toString() + '.');
    });
});

try {
    n.with_mut(mut_n => {
        n.with_ref(ref_n => {});
    });
} catch (err) {
    console.log(err);
}

const m = n.move();
try {
    n.with_ref(ref_n => {});
} catch (err) {
    console.log(err);
}