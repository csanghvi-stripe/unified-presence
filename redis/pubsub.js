//import Redis from "ioredis";
var Redis = require('ioredis');
//var redis = new Redis();
const host = "localhost";
const port = 6379;
const db = 0;
const subscriber = new Redis({ host, port, db });
const publisher = new Redis({ host, port, db });

module.exports= new class PubSub {
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
