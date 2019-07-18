import { WampInvocationException } from '../Common/WampInvocationException';
import { IMessage } from '../Messages/Message';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';
import { Subject } from 'rxjs/Subject';
import { Scheduler } from 'rxjs/Scheduler';
export interface RegisterOptions {
    progress?: boolean;
    invoke?: string | 'first' | 'last' | 'roundrobin' | 'random' | '_thruway' | 'single' | 'all';
    match?: string | 'prefix' | 'wildcard' | 'exact';
    disclose_caller?: boolean;
    force_reregister?: boolean;
    replace_orphaned_sessions?: boolean | 'yes' | 'no';
    [propName: string]: any;
}
export declare class RegisterObservable<T> extends Observable<T> {
    private uri;
    private callback;
    private webSocket;
    private options;
    private extended;
    private scheduler;
    private messages;
    private invocationErrors;
    constructor(uri: string, callback: Function, messages: Observable<IMessage>, webSocket: Subject<any>, options?: RegisterOptions, extended?: boolean, invocationErrors?: Subject<WampInvocationException>, scheduler?: Scheduler);
    _subscribe(subscriber: Subscriber<any>): Subscription | Function | void;
}
