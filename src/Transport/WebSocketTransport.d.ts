import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { Subject } from 'rxjs/Subject';
import { TransportInterface } from './TransportInterface';
export declare class WebSocketTransport<Message> extends Subject<any> implements TransportInterface {
    private url;
    private protocols;
    private autoOpen;
    private output;
    private socket;
    private openSubject;
    private closeSubject;
    private resetKeepaliveSubject;
    private keepAliveTimer;
    constructor(url?: string, protocols?: string | string[], autoOpen?: boolean);
    _subscribe(subscriber: Subscriber<any>): Subscription;
    private connectSocket();
    private keepAlive(ws);
    next(msg: any): void;
    unsubscribe(): void;
    readonly onOpen: Observable<any>;
    readonly onClose: Observable<any>;
    open(): void;
}
