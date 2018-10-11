var logger = require('../config/winston');
import Redis from "ioredis";
//var redis = require('redis');

module.exports = function(config) {
  config = config || {};
  var redis = new Redis(config);
  redis.on("ready", () => {
    redis.config("SET", "notify-keyspace-events", "Ex");
  });
  var storage = {};
  var methods = [];
  if (config.namespace === "calendar") {
    methods = [].concat(config.methods);

    // Implements required API methods
    for (var i = 0; i < methods.length; i++) {
      storage[methods[i]] = getCalStorageObj(redis, config.namespace + ':' + methods[i]);
    }
  } else {
    config.namespace = config.namespace || 'slackapp:store';
    config.methods = config.methods || [];
    methods = ['teams', 'users', 'channels'].concat(config.methods);

    // Implements required API methods
    for (var i = 0; i < methods.length; i++) {
      storage[methods[i]] = getStorageObj(redis, config.namespace + ':' + methods[i]);
    }
  }



  return storage;
};

/**
 * Function to generate a storage object for a given namespace
 *
 * @param {Object} client The redis client
 * @param {String} namespace The namespace to use for storing in Redis
 * @returns {{get: get, save: save, all: all, allById: allById}}
 */
function getStorageObj(client, namespace) {
  return {
    get: function(id, cb) {
      logger.debug("Looking for Object: ", id);
      client.hget(namespace, id, function(err, res) {
        logger.debug("Res: ", res);
        if (!res) {
          logger.debug("Res is null");
        } else {
          logger.debug("res is not null");
        }
        cb(err, res ? JSON.parse(res) : null);
      });
    },
    save: function(object, cb) {
      if (!object.id) {
        return cb(new Error('The given object must have an id property'), {});
      }

      client.hset(namespace, object.id, JSON.stringify(object), cb);
    },
    remove: function(id, cb) {
      client.hdel(namespace, [id], cb);
    },
    all: function(cb, options) {
      client.hgetall(namespace, function(err, res) {
        if (err) {
          return cb(err);
        }

        var parsed,
          array = [];

        for (var i in res) {
          parsed = JSON.parse(res[i]);
          res[i] = parsed;
          array.push(parsed);
        }

        cb(null, options && options.type === 'object' ? res : array);
      })
    }
  };
}

function getCalStorageObj(client, namespace) {
  return {
    setUserCalendar: function(ns, key, value, expire, cb) {
      logger.debug(ns, key, value, expire);
      client
        .multi()
        .hset(ns, key, JSON.stringify(value))
        .set(`reminder:${ns}:${key}`, 1)
        .expire(`reminder:${ns}:${key}`, expire)
        .exec(function(err, res) {
          if (err) {
            return cb(err);
          }
          logger.debug("setCakendar Event response is:", res);
          cb(err, res ? res : null);
        });

    },
    getUserCalendar: function(ns, key, cb) {
      logger.debug(ns, key);
      client.hget(ns, key, function(err, res) {
        logger.debug("Res: ", res);
        if (!res) {
          logger.debug("Res is null");
        } else {
          logger.debug("res is not null");
        }
        cb(err, res ? JSON.parse(res) : null);
      });

    }
  };
}
