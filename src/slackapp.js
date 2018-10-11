//import DBClient from "./redis/dbclient";
const sc = require('@slack/client').WebClient;
var logger = require('../config/winston');

function SlackApp(configuration) {
  var slackapp = {
    events: {}, // this will hold event slackapps
    config: {}, // this will hold the configuration
    tasks: [],
    memory_store: {
      users: {},
      channels: {},
      teams: {},
    }
  };

  slackapp.storage = require("../redis/datastore.js")();

  let config = {
    namespace: "slackapp:userstore"
  };
  slackapp.userstore = require("../redis/datastore.js")(config);
  slackapp.findTeamById = function(id, cb) {
    logger.debug("Find Team by Id"+ id);
    slackapp.storage.teams.get(id, cb);
  };
  slackapp.on = function(event, cb, is_hearing) {
    logger.debug('Setting up a slackapp for'+ event);
    var events = (typeof(event) == 'string') ? event.split(/\,/g) : event;

    for (var e in events) {
      if (!this.events[events[e]]) {
        this.events[events[e]] = [];
      }
      this.events[events[e]].push({
        callback: cb,
        type: is_hearing ? 'hearing' : 'event'
      });
    }
    return this;
  };

  slackapp.trigger = function(event, data) {
    if (this.events[event]) {

      var hearing = this.events[event].filter(function(e) {
        return (e.type == 'hearing');
      });

      var event_slackapps = this.events[event].filter(function(e) {
        return (e.type != 'hearing');
      });


      // first, look for hearing type events
      // these are always handled before normal event slackapps
      for (var e = 0; e < hearing.length; e++) {
        var res = hearing[e].callback.apply(this, data);
        if (res === false) {
          return;
        }
      }

      // now, if we haven't already heard something,
      // fire the remaining event slackapps
      if (event_slackapps.length) {
        //  slackapp.middleware.triggered.run(data[0], data[1], function(err, bot, message) {
        for (var e = 0; e < event_slackapps.length; e++) {
          var res = event_slackapps[e].callback.apply(this, data);
          if (res === false) {
            return;
          }
        }
        //});
      }
    }
  };

  slackapp.config = configuration;

  slackapp.slackclient = function(token) {
    const WebClient = require('@slack/client').WebClient;
    var accesstoken = token || slackapp.config.token;
    const web = new WebClient(accesstoken, {
      // Allow up to 10 requests to be in-flight at a time
      maxRequestConcurrency: 10,
    });
    return web;
  };

  //  slackapp.dbclient = new DBClient();
  slackapp.getUser = function(id, cb) {
    this.userstore.users.get(id, cb, function(err, userObj) {
      if (err) {
        logger.error(`An error occurred while saving a user obj:  ${err}`);
        slackapp.trigger('error', [err]);
      } else {
        logger.debug("User Received from Redis: "+ result);
      }
      cb(err, res ? JSON.parse(res) : null);
    });
  }
  slackapp.saveUser = function(userObj, cb) {

    this.userstore.users.save(userObj, function(err, result) {
      if (err) {
        logger.error('An error occurred while saving a user obj: '+ err);
        slackapp.trigger('error', [err]);
      } else {
        logger.debug("User Saved: "+ result);
      }
    });
  }

  var calendar_config = {
    namespace: "calendar"
  };
  calendar_config.methods = "calendar";
  slackapp.driver = require('../redis/datastore.js')(calendar_config);

  slackapp.setCalendar = function(email, calendarObj, cb) {

    /*    let value = {
          meeting: "Working with Client",
          startTime: "1539025832",
          endTime:"1539025862"
        };
    */
    let ns = "calendar:" + email;
    let key = "123";
    //expiration is calculated as
    //meeting start time - current time//So if meeting start time is 10AM & Current time is 7AM
    //Then expiration in seconds = 10800seconds
    let expire = calendarObj.startTime - Math.floor(Date.now() / 1000);
    logger.debug("Expiration is: "+ expire);
    //let expire = 10;
    //slackapp.dbclient.setReminder(namespace,"123", JSON.stringify(value), 10);

    this.driver.calendar.setUserCalendar(ns, key, calendarObj, expire, function(err, res) {
      if (err) {
        logger.error("Something went wrong in setting reminder"+ err);
        //cb(err);
      } else {
        logger.debug("res is: "+ res);
        //cb(res);
      }
      cb(err, res ? res : null);

    });
  }
  slackapp.getCalendar = function(ns, key, cb) {
    this.driver.calendar.getUserCalendar(ns, key, function(err, calendarObj) {
      if (err) {
        logger.error("Something went wrong in setting reminder"+err);
        //cb(err);
      } else {
        logger.debug("res is: "+calendarObj);
        //cb(res);
      }
      cb(err, calendarObj ? calendarObj : null);

    });
  }



  return slackapp;
}

module.exports = SlackApp;
