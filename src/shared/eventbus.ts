import EventEmitter from 'events'

export type DomainEvents =
    | "match.created"
    | "match.ended"
    | "submission.accepted"
    | "submission.rejected";

export class EventBus extends EventEmitter {
  publish(event: DomainEvents, payload: any) {
    this.emit(event, payload);
  }

  subscribe(event: DomainEvents, handler: (payload: any) => void) {
    this.on(event, handler);
  }
}

export const eventBus = new EventBus();