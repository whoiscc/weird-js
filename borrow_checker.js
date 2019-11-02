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
        this._captured = false;
    }

    capture(handler) {
        if (this._captured) {
            throw new Error('Cannot capture');
        }
        this._captured = true;
        try {
            this._proxy._capture_ref(handler);
        } finally {
            this._captured = false;
        }
    }
}

class ObjectMut {
    constructor(proxy) {
        this._proxy = proxy;
    }

    capture(handler) {
        if (this._captured) {
            throw new Error('Cannot capture');
        }
        this._captured = true;
        try {
            this._proxy._capture_mut(handler);
        } finally {
            this._captured = false;
        }
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

class SafeVector {
    constructor() {
        this._vec = new ObjectProxy([]);
    }

    push_back(element) {
        this._vec.with_mut(mut_vec => {
            mut_vec.capture(raw_vec => {
                raw_vec.push(element.move());
                return raw_vec;
            });
        });
    }

    at(index) {
        return resolve => {
            this._vec.with_ref(ref_vec => {
                index.with_ref(ref_index => {
                    ref_vec.capture(raw_vec => {
                        ref_index.capture(raw_index => {
                            raw_vec[raw_index].with_ref(resolve);
                        });
                    });    
                });
            });    
        }
    }
}

const vector = new SafeVector();
vector.push_back((new ObjectProxy('hello')).move());
vector.push_back((new ObjectProxy('world')).move());
vector.at(new ObjectProxy(0))(ref_element => {
    ref_element.capture(raw_element => {
        console.log(raw_element);
    });
});
vector.push_back((new ObjectProxy('again')).move());
vector.at(new ObjectProxy(2))(ref_element => {
    try {
        vector.push_back((new ObjectProxy('error')).move());
        console.log('ok');
    } catch (err) {
        console.log(err);
    }
});