"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WampChallengeException_1 = require("./Common/WampChallengeException");
var WebSocketTransport_1 = require("./Transport/WebSocketTransport");
var RegisterObservable_1 = require("./Observable/RegisterObservable");
var AuthenticateMessage_1 = require("./Messages/AuthenticateMessage");
var TopicObservable_1 = require("./Observable/TopicObservable");
var ChallengeMessage_1 = require("./Messages/ChallengeMessage");
var CallObservable_1 = require("./Observable/CallObservable");
var GoodbyeMessage_1 = require("./Messages/GoodbyeMessage");
var WelcomeMessage_1 = require("./Messages/WelcomeMessage");
var PublishMessage_1 = require("./Messages/PublishMessage");
var HelloMessage_1 = require("./Messages/HelloMessage");
var AbortMessage_1 = require("./Messages/AbortMessage");
var ReplaySubject_1 = require("rxjs/ReplaySubject");
var Utils_1 = require("./Common/Utils");
var Observable_1 = require("rxjs/Observable");
var Subscription_1 = require("rxjs/Subscription");
var rxjs_1 = require("rxjs");
require("rxjs/add/operator/filter");
require("rxjs/add/operator/take");
require("rxjs/add/operator/mergeMap");
require("rxjs/add/operator/merge");
require("rxjs/add/operator/take");
require("rxjs/add/operator/share");
require("rxjs/add/operator/do");
require("rxjs/add/operator/map");
require("rxjs/add/operator/mapTo");
require("rxjs/add/operator/share");
require("rxjs/add/operator/retryWhen");
require("rxjs/add/operator/switchMap");
require("rxjs/add/operator/switchMapTo");
require("rxjs/add/operator/takeUntil");
require("rxjs/add/operator/takeWhile");
require("rxjs/add/operator/delay");
require("rxjs/add/operator/publishReplay");
require("rxjs/add/operator/publish");
require("rxjs/add/operator/catch");
require("rxjs/add/operator/finally");
require("rxjs/add/operator/exhaust");
require("rxjs/add/operator/defaultIfEmpty");
require("rxjs/add/operator/multicast");
require("rxjs/add/operator/shareReplay");
require("rxjs/add/observable/empty");
require("rxjs/add/observable/from");
require("rxjs/add/observable/timer");
require("rxjs/add/observable/of");
require("rxjs/add/observable/merge");
require("rxjs/add/observable/throw");
var Client = (function () {
    function Client(urlOrTransport, realm, options, transport) {
        if (options === void 0) { options = {}; }
        var _this = this;
        this.urlOrTransport = urlOrTransport;
        this.realm = realm;
        this.options = options;
        this.transport = transport;
        this.currentRetryCount = 0;
        this.transport = typeof urlOrTransport === 'string'
            ? new WebSocketTransport_1.WebSocketTransport(urlOrTransport)
            : this.urlOrTransport;
        this.subscription = new Subscription_1.Subscription();
        var open = this.transport.onOpen;
        this.messages = this.transport
            .retryWhen(function (attempts) {
            var maxRetryDelay = 300000;
            var initialRetryDelay = 1500;
            var retryDelayGrowth = 1.5;
            var maxRetries = 550;
            return attempts
                .flatMap(function (ex) {
                console.error(ex.message);
                console.log('Reconnecting');
                var delay = Math.min(maxRetryDelay, Math.pow(retryDelayGrowth, ++_this.currentRetryCount) + initialRetryDelay);
                return Observable_1.Observable.timer(Math.floor(delay));
            })
                .take(maxRetries);
        })
            .map(function (msg) {
            if (msg instanceof AbortMessage_1.AbortMessage) {
                rxjs_1.Scheduler.async.schedule(function () {
                    throw new Error('Connection ended because ' + msg.details);
                }, 0);
            }
            return msg;
        })
            .share();
        this._onClose = this.messages
            .filter(function (msg) { return msg instanceof AbortMessage_1.AbortMessage || msg instanceof GoodbyeMessage_1.GoodbyeMessage; })
            .share();
        open
            .do(function () {
            _this.currentRetryCount = 0;
        })
            .map(function (_) {
            _this.options.roles = Client.roles();
            return new HelloMessage_1.HelloMessage(_this.realm, _this.options);
        })
            .subscribe(function (m) { return _this.transport.next(m); });
        var challengeMsg = this.messages
            .filter(function (msg) { return msg instanceof ChallengeMessage_1.ChallengeMessage; })
            .switchMap(function (msg) {
            try {
                return _this.challengeCallback(Observable_1.Observable.of(msg)).take(1);
            }
            catch (e) {
                throw new WampChallengeException_1.WampChallengeException(msg);
            }
        })
            .map(function (signature) { return new AuthenticateMessage_1.AuthenticateMessage(signature); })
            .catch(function (error) {
            if (error instanceof WampChallengeException_1.WampChallengeException) {
                return Observable_1.Observable.of(error.abortMessage());
            }
            return Observable_1.Observable.throw(error);
        })
            .do(function (m) { return _this.transport.next(m); });
        this._session = this.messages
            .merge(challengeMsg)
            .filter(function (msg) { return msg instanceof WelcomeMessage_1.WelcomeMessage; })
            .multicast(function () { return new ReplaySubject_1.ReplaySubject(1); }).refCount();
        this.subscription.add(this.transport);
    }
    Client.roles = function () {
        return {
            'caller': {
                'features': {
                    'caller_identification': true,
                    'progressive_call_results': true,
                    'call_canceling': true
                }
            },
            'callee': {
                'features': {
                    'caller_identification': true,
                    'pattern_based_registration': true,
                    'shared_registration': true,
                    'progressive_call_results': true,
                    'registration_revocation': true,
                    'call_canceling': true
                }
            },
            'publisher': {
                'features': {
                    'publisher_identification': true,
                    'subscriber_blackwhite_listing': true,
                    'publisher_exclusion': true
                }
            },
            'subscriber': {
                'features': {
                    'publisher_identification': true,
                    'pattern_based_subscription': true,
                    'subscription_revocation': true
                }
            }
        };
    };
    Client.prototype.topic = function (uri, options) {
        return this._session
            .takeUntil(this.onClose)
            .switchMapTo(new TopicObservable_1.TopicObservable(uri, options, this.messages, this.transport));
    };
    Client.prototype.publish = function (uri, value, options) {
        var obs = typeof value.subscribe === 'function' ? value : Observable_1.Observable.of(value);
        var completed = new rxjs_1.Subject();
        return this._session
            .takeUntil(completed)
            .takeUntil(this.onClose)
            .mapTo(obs.do(null, null, function () {
            completed.next(0);
        }))
            .exhaust()
            .map(function (v) { return new PublishMessage_1.PublishMessage(Utils_1.Utils.uniqueId(), options, uri, [v]); })
            .subscribe(this.transport);
    };
    Client.prototype.call = function (uri, args, argskw, options) {
        return this._session
            .merge(this.onClose.mapTo(Observable_1.Observable.throw(new Error('Connection Closed'))))
            .take(1)
            .switchMapTo(new CallObservable_1.CallObservable(uri, this.messages, this.transport, args, argskw, options));
    };
    Client.prototype.register = function (uri, callback, options) {
        return this._session
            .merge(this.onClose.mapTo(Observable_1.Observable.throw(new Error('Connection Closed'))))
            .switchMapTo(new RegisterObservable_1.RegisterObservable(uri, callback, this.messages, this.transport, options));
    };
    Client.prototype.progressiveCall = function (uri, args, argskw, options) {
        if (options === void 0) { options = {}; }
        options.receive_progress = true;
        var completed = new rxjs_1.Subject();
        var callObs = new CallObservable_1.CallObservable(uri, this.messages, this.transport, args, argskw, options);
        var retry = false;
        return this._session
            .merge(this.onClose.mapTo(Observable_1.Observable.throw(new Error('Connection Closed'))))
            .takeUntil(completed)
            .switchMapTo(callObs.do(null, null, function () {
            completed.next(0);
        }))
            .do(function () {
            retry = false;
        })
            .retryWhen(function (errors) {
            return errors
                .flatMap(function (e) {
                if (e.errorUri === 'wamp.error.canceled' || retry) {
                    retry = true;
                    return Observable_1.Observable.of(e);
                }
                return Observable_1.Observable.empty();
            })
                .delay(5000);
        });
    };
    Client.prototype.progressiveRegister = function (uri, callback, options) {
        if (options === void 0) { options = {}; }
        options.progress = true;
        options.replace_orphaned_sessions = 'yes';
        return this.register(uri, callback, options);
    };
    Client.prototype.onChallenge = function (challengeCallback) {
        this.challengeCallback = challengeCallback;
    };
    Client.prototype.close = function () {
        this.subscription.unsubscribe();
    };
    Object.defineProperty(Client.prototype, "onOpen", {
        get: function () {
            return this._session;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Client.prototype, "onClose", {
        get: function () {
            return this._onClose;
        },
        enumerable: true,
        configurable: true
    });
    return Client;
}());
exports.Client = Client;
//# sourceMappingURL=Client.js.map