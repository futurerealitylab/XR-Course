"use strict";

export class ServerPublishSubscribe {
  constructor() {
    this.subscribers = {};
    this.subscribersOneShot = {};
  }
  subscribe(channel, subscriber, data) {
    this.subscribers[channel] = this.subscribers[channel] || new Map();
    this.subscribers[channel].set(subscriber, { sub: subscriber, data: data });
  }
  unsubscribeAll(subscriber) {
    for (let prop in this.subscribers) {
      if (Object.prototype.hasOwnProperty.call(this.subscribers, prop)) {
        const setObj = this.subscribers[prop].delete(subscriber);
      }
    }
  }
  subscribeOneShot(channel, subscriber, data) {
    this.subscribersOneShot[channel] =
      this.subscribersOneShot[channel] || new Map();
    this.subscribersOneShot[channel].set(subscriber, {
      sub: subscriber,
      data: data,
    });
  }
  publish(channel, ...args) {
    (this.subscribers[channel] || new Map()).forEach((value, key) =>
      value.sub(value.data, ...args)
    );
    (this.subscribersOneShot[channel] || new Map()).forEach((value, key) =>
      value.sub(value.data, ...args)
    );
    this.subscribersOneShot = {};
  }
}
