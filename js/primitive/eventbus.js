"use strict";

// TODO:
// handle scope with subscription
// return unsubscribe "token"
// make this a global,
// convert every event bus in metaroom to use this
// potential priority levels to enforce ordering: [system | world | user]
// this + networking - linearizability...
// browser + node compatibility
// decorators
// handle underflow for uniqueId in case of long running server

let isVerbose = false;

export class EventBus {
  constructor() {
    this.callbacks = {};
    this.currentId = 0;
  }

  uniqueId() {
    return this.currentId++;
  }

  unsubscribeAll() {
    this.callbacks = {};
  }

  unsubscribe(channel, id) {
    delete this.callbacks[channel][id];
    if (Object.keys(this.callbacks[channel]).length === 0) {
      delete this.callbacks[channel];
    }
  }

  subscribe(channel, callback) {
    const id = this.uniqueId();

    if (!this.callbacks[channel]) this.callbacks[channel] = {};

    this.callbacks[channel][id] = callback;

    return id;
  }

  // useful for one-time events,
  // removes the callback after only one use
  subscribeOneShot(channel, callback) {
    const id = this.uniqueId();

    if (!this.callbacks[channel]) this.callbacks[channel] = {};

    this.callbacks[channel][id] = (args) => {
      this.unsubscribe(channel, id);
      return callback(args);
    };

    return id;
  }

  publish(channel, event) {
    if (
      channel in this.callbacks &&
      Object.keys(this.callbacks[channel]).length > 0
    ) {
      Object.keys(this.callbacks[channel]).forEach((key) =>
        this.callbacks[channel][key](event)
      );
    } else {
      if (isVerbose)
        console.warn("message of type %s is not supported yet", channel);
    }
  }
}
