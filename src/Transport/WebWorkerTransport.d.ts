import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { Subject } from 'rxjs/Subject';
import { TransportInterface } from './TransportInterface';
export declare class WebWorkerTransport<Message> extends Subject<any> implements TransportInterface {
    private workerName;
    private url;
    private protocols;
    private output;
    private open;
    private close;
    private worker;
    constructor(workerName?: string, url?: string, protocols?: string | string[]);
    _subscribe(subscriber: Subscriber<any>): Subscription;
    next(msg: any): void;
    unsubscribe(): void;
    readonly onOpen: Observable<any>;
    readonly onClose: Observable<any>;
}
