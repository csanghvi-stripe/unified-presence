// src/redis.repo.js
import Redis from "ioredis";
const host = "localhost";
const port = 6379;
const db = 0;
export default class DBClient {
  constructor() {
    this.redis = new Redis({
      port,
      host,
      db
    });
    this.redis.on("ready", () => {
      this.redis.config("SET", "notify-keyspace-events", "Ex");
    });
  }
  get(key) {
    return this.redis.get(key);
  }
  hget(ns, key) {
    return this.redis.hget(ns, key);
  }
  hmget(ns, key) {
    return this.redis.hmget(ns, key);
  }

  set(key, value) {
    return this.redis.set(key, value);
  }

  hset(ns, key, value) {
    return this.redis.hset(ns, key, value);
  }

  hmset(ns, key, value) {
    return this.redis.hmset(ns, key, value);
  }

  setReminder(ns, key, value, expire) {
    console.log(ns,key,value,expire);
    this.redis
      .multi()
      .hset(ns, key, value)
      .set(`reminder:${ns}:${key}`, 1)
      .expire(`reminder:${ns}:${key}`, expire)
      .exec();
  }


}
