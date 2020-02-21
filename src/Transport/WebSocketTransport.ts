import {Subscription} from 'rxjs';
import {Observable} from 'rxjs';
import {Subscriber} from 'rxjs';
import {Subject} from 'rxjs';
import {CreateMessage} from '../Messages/CreateMessage';
import WS = require('ws');
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/catch';

// This is used for WebSockets in node - removed by webpack for bundling
declare var require: any;
const WebSocket2 = require('ws');

export class WebSocketTransport<M> extends Subject<M> {

    private output: Subject<any> = new Subject();
    private socket: WebSocket = null;
    private resetKeepaliveSubject = new Subject();
    private keepAliveTimer = 30000;

    constructor(
        private url: string = 'ws://127.0.0.1:9090/',
        private protocols: string | string[] = ['wamp.2.json'],
        private openSubject = new Subject(),
        private closeSubject = new Subject(),
        private autoOpen: boolean = true
    ) {
        super();
    }

    public _subscribe(subscriber: Subscriber<any>): Subscription {

        this.output = new Subject();

        const subscription = new Subscription();

        if (this.autoOpen) {
            this.connectSocket();
        }

        subscription.add(this.output.subscribe(subscriber));

        subscription.add(() => {
            setTimeout(() => {
                if (this.socket) {
                    console.log('closing socket');
                    this.socket.close();
                    this.socket = null;
                }
            }, 100);
        });

        return subscription;
    }

    private connectSocket(): void {
        if (this.socket) {
            return;
        }

        try {
            let ws: any;
            if (typeof WebSocket === 'undefined') {
                ws = new WebSocket2(this.url, this.protocols);
                this.keepAlive(ws);
            } else {
                ws = new WebSocket(this.url, this.protocols);
            }

            ws.onerror = (err: Error) => {
                this.resetKeepaliveSubject.next(0);
                this.socket = null;
                this.output.error(err);
            };

            ws.onclose = (e: CloseEvent) => {
                this.resetKeepaliveSubject.next(0);
                this.socket = null;
                this.closeSubject.next(e);

                // Handle all closes as errors
                const ex = new Error(e.reason || 'The WebSocket connection was closed');
                this.output.error(ex);
            };

            ws.onopen = (e: Event) => {
                console.log('socket opened');
                this.socket = ws;
                this.openSubject.next(e);
            };

            ws.onmessage = (e: MessageEvent) => {
                this.output.next(CreateMessage.fromArray(JSON.parse(e.data)));
            };

        } catch (ex) {
            this.output.error(ex);
        }
    }

    private keepAlive(ws: WS) {

        this.resetKeepaliveSubject.next(0);

        Observable.fromEvent(ws, 'pong')
            .startWith(0)
            .switchMapTo(Observable.timer(this.keepAliveTimer)
                .do(() => ws.ping())
                .delay(20000)
            )
            .takeUntil(this.resetKeepaliveSubject)
            .catch(e => {
                console.log(e.message);
                return Observable.of();
            })
            .subscribe(() => {
                console.log('Terminating because we have not received a pong back from the server');
                ws.terminate()
            });
    }

    public next(msg: any): void {
        if (!this.socket) {
            return;
        }

        this.socket.send(JSON.stringify(msg.wampifiedMsg()));
    }

    public unsubscribe(): void {
        super.unsubscribe();

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    public open() {
        this.connectSocket();
        this.autoOpen = true;
    }
}
