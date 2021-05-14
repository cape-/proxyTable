const { v4: uuid } = require('uuid');
var App = (function() {
    this.dw = {
        Config: {
            defaultFreshTimeout: 15 // 15 seconds
        },
        Models: {
            TableModel: { fresh: false, data: [], getData: () => {} }
        },
        expirationQueue: [],
        expirationDaemon: {
            start: function() {
                const _dw = this.dw;
                if (!_dw.expirationDaemon.intervalId) {
                    _dw.expirationDaemon.intervalId = setInterval(function() {
                            const _dw = this.dw;
                            const _now = Date.now();
                            _dw.expirationQueue.forEach(function(expObj, i, queue) {
                                if (expObj.expirationTs <= _now) {
                                    _dw[expObj.uuid].fresh = false; // Expirate data
                                    queue.splice(i, 1); // Delete record from
                                }
                            });
                        }.bind(this), 1000) // Run daemon once per second
                }
            }.bind(this),
            stop: function() {
                const _dw = this.dw;
                if (_dw.expirationDaemon.intervalId) {
                    clearInterval(_dw.expirationDaemon.intervalId);
                    _dw.expirationDaemon.intervalId = null;
                }
            }.bind(this)
        }
    };
    this.dw.createData = function(model, fget) {
        const _dw = this.dw;
        const _uuid = uuid();
        const _timeout = _dw.Config.defaultFreshTimeout * 1000;
        // Store Proxy dataModel in dw
        Object.defineProperty(_dw, _uuid, {
            value: {...model }
        });
        if (typeof fget === 'function') {
            // Set data as get method
            Object.assign(_dw[_uuid], {
                getData: function(_src) {
                    var _retData = fget();
                    if (_retData) {
                        _src.data = _retData
                        _src.fresh = true;
                        // TODO: Montar cachemonitor para este objeto en vez de setTimeout
                        _dw.expirationQueue.push({ expirationTs: Date.now() + _timeout, uuid: _uuid })
                            // setTimeout((s) => { s.fresh = false }, _timeout, _src);
                    }
                    return _retData;
                }
            });
        } else if (typeof fget === 'object' && fget.get) {
            // TODO: accept typeof fget === 'object' && fget.get
            // fget = {
            //     get: function() {},
            //     freshTimeout: 60  // 1 minute
            // }
        } else {
            // Or directly set data as object
            Object.assign(_dw[_uuid], {
                data: fget,
                fresh: true
            });
        }
        // Start expiration daemon
        _dw.expirationDaemon.start();
        // Return instance of Proxy handler for the data
        return new Proxy(_dw[_uuid], {
            get: function(src, prop) {
                if (prop === 'data')
                    return src.fresh ? src.data : src.getData(src); // (o sería) src.data : src.data = src.getData();
                return Reflect.get(...arguments);
            }
        });
    }.bind(this);

    // Wrapper
    this.dw.createTable = this.dw.createData.bind(this, this.dw.Models.TableModel);

    /* Usage */
    this.stdTable = { data: [{ a: 1, b: 'c' }, { a: 2, b: 'c' }, { a: 3, b: 'c' }] };
    this.proxyTable = this.dw.createTable(() => {
        console.log('customProxyTable getData() called');
        return [{ z: 8, x: 'i' }, { z: 9, x: 'j' }]
    })

    // console.log(this);
    setInterval(function() {
        console.log(Date());
        this.stdTable.data.forEach(l => console.log(l));
        this.proxyTable.data.forEach(l => console.log(l));
    }.bind(this), 5 * 1000);

})();