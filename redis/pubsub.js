import Redis from "ioredis";
const host = "localhost";
const port = 6379;
const db = 0;
const subscriber = new Redis({ host, port, db });
const publisher = new Redis({ host, port, db });

export default new class PubSub {
  publish(channel, message) {
    publisher.publish(channel, message);
  }
  subscribe(channel) {
    subscriber.subscribe(channel);
  }
  on(event, callback) {
    subscriber.on(event, (channel, message) => {
      callback(channel, message);
    });
  }
}();
