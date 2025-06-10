/**
 * Type declaration override for eventsource package to fix TypeScript error
 */

declare module 'eventsource' {
  import { EventEmitter } from 'events';
  
  class EventSource extends EventEmitter {
    constructor(url: string, eventSourceInitDict?: EventSourceInit);
    url: string;
    readyState: number;
    withCredentials: boolean;
    close(): void;
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSED: number;
  }
  
  interface EventSourceInit {
    withCredentials?: boolean;
    headers?: object;
    proxy?: string;
    https?: object;
    rejectUnauthorized?: boolean;
  }
  
  export = EventSource;
}