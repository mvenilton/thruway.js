"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Subscription_1 = require("rxjs/Subscription");
var Observable_1 = require("rxjs/Observable");
var Subject_1 = require("rxjs/Subject");
var CreateMessage_1 = require("../Messages/CreateMessage");
var WebSocket2 = require('ws');
var WebSocketTransport = (function (_super) {
    __extends(WebSocketTransport, _super);
    function WebSocketTransport(url, protocols, autoOpen) {
        if (url === void 0) { url = 'ws://127.0.0.1:9090/'; }
        if (protocols === void 0) { protocols = ['wamp.2.json']; }
        if (autoOpen === void 0) { autoOpen = true; }
        var _this = this;
        _this.url = url;
        _this.protocols = protocols;
        _this.autoOpen = autoOpen;
        _this.output = new Subject_1.Subject();
        _this.socket = null;
        _this.openSubject = new Subject_1.Subject();
        _this.closeSubject = new Subject_1.Subject();
        _this.resetKeepaliveSubject = new Subject_1.Subject();
        _this.keepAliveTimer = 30000;
        return _this;
    }
    WebSocketTransport.prototype._subscribe = function (subscriber) {
        var _this = this;
        this.output = new Subject_1.Subject();
        var subscription = new Subscription_1.Subscription();
        if (this.autoOpen) {
            this.connectSocket();
        }
        subscription.add(this.output.subscribe(subscriber));
        subscription.add(function () {
            if (_this.socket) {
                console.log('closing socket');
                _this.socket.close();
                _this.socket = null;
            }
        });
        return subscription;
    };
    WebSocketTransport.prototype.connectSocket = function () {
        var _this = this;
        if (this.socket) {
            return;
        }
        try {
            var ws_1;
            if (typeof WebSocket === 'undefined') {
                ws_1 = new WebSocket2(this.url, this.protocols);
                this.keepAlive(ws_1);
            }
            else {
                ws_1 = new WebSocket(this.url, this.protocols);
            }
            ws_1.onerror = function (err) {
                _this.resetKeepaliveSubject.next(0);
                _this.socket = null;
                _this.output.error(err);
            };
            ws_1.onclose = function (e) {
                _this.resetKeepaliveSubject.next(0);
                _this.socket = null;
                _this.closeSubject.next(e);
                _this.output.error(e);
            };
            ws_1.onopen = function (e) {
                console.log('socket opened');
                _this.socket = ws_1;
                _this.openSubject.next(e);
            };
            ws_1.onmessage = function (e) {
                _this.output.next(CreateMessage_1.CreateMessage.fromArray(JSON.parse(e.data)));
            };
        }
        catch (ex) {
            this.output.error(ex);
        }
    };
    WebSocketTransport.prototype.keepAlive = function (ws) {
        this.resetKeepaliveSubject.next(0);
        Observable_1.Observable.fromEvent(ws, 'pong')
            .startWith(0)
            .switchMapTo(Observable_1.Observable.timer(this.keepAliveTimer)
            .do(function () { return ws.ping(); })
            .delay(20000))
            .takeUntil(this.resetKeepaliveSubject)
            .catch(function (e) {
            console.log(e.message);
            return Observable_1.Observable.of();
        })
            .subscribe(function () {
            console.log('Terminating because we have not received a pong back from the server');
            ws.terminate();
        });
    };
    WebSocketTransport.prototype.next = function (msg) {
        if (!this.socket) {
            return;
        }
        this.socket.send(JSON.stringify(msg.wampifiedMsg()));
    };
    WebSocketTransport.prototype.unsubscribe = function () {
        _super.prototype.unsubscribe.call(this);
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    };
    Object.defineProperty(WebSocketTransport.prototype, "onOpen", {
        get: function () {
            return this.openSubject.asObservable();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocketTransport.prototype, "onClose", {
        get: function () {
            return this.closeSubject.asObservable();
        },
        enumerable: true,
        configurable: true
    });
    WebSocketTransport.prototype.open = function () {
        this.connectSocket();
        this.autoOpen = true;
    };
    return WebSocketTransport;
}(Subject_1.Subject));
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=WebSocketTransport.js.map