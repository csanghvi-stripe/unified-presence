// Initialize using signing secret from environment variables
//UserObj build upon app installation, saves all info on user
//in redis: <userId, UserObj> (set) (get) (getAll)
//Anytime team_join event is fired, user is created on SlackStrategy
//Lookup table for a users presence updated on Slack. Anytime a user updates slack status, set a flag for that user
//This flag will be checked, if it is not set, than only we will allow our app to update someones status
//We may choose to use hmset for User record, so that under name space user-info, we will store
//Key1-value1 as id-userobj, key2-value2 as flag true/false

//setReminder/setMeeting function is called for every meeting for every users
//this will add a users calendar into redis as <userid> (NS) timestamp <key> Meeting Obj <Value>. This will be a multi-hash
//with all meetings for users
//As part of making a setReminder call, caller will also pass an expire parameter
//This parameter will be calculated by Caller based on  Meeting Time stamp - current timestamp

//import 'babel-polyfill';
//import DBClient from "./redis/dbclient";
//import RedisExpiredEvents from "../redis/redis.expired-events";
//import express from "express";
var express = require("express");
var RedisExpiredEvents = require("../redis/redis.expired-events.js");
var logger = require('../config/winston');


require('dotenv').config();
if (process.env.NODE_ENV !== 'production') {
   require('dotenv').load();
 }

var redis = require('redis');



if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET || !process.env.PORT) {
  usage_tip();
  process.exit(1);
}

var list_of_scopes = process.env.SCOPES.split(",");
var options = {
  clientid:process.env.SLACK_CLIENT_ID,
  clientsecret:process.env.SLACK_CLIENT_SECRET,
  token:process.env.TOKEN,
  scopes:list_of_scopes
};

const http = require('http');
const app = express();
logger.debug("Overriding 'Express' logger");
app.use(require('morgan')({ "stream": logger.stream }));
app.use("/calendar", express.json());
var server = http.createServer(app);


server.listen(process.env.PORT || 3000, null, function() {

    logger.info('Express webserver configured and listening at http://localhost:' + process.env.PORT || 3000);

});

/*
var config = {
  token
}
*/
var admin_user_token = options.token;
var slackapp = require("./slackapp.js")({token:admin_user_token});


require("../slack/webclient.js")(slackapp,admin_user_token);
const botAuthorizations = require('../slack/auth.js')(app,slackapp, options);
var options_events = {
  signingsecret:process.env.SLACK_SIGNING_SECRET
}
require('../slack/events.js')(app,slackapp, options_events)
RedisExpiredEvents(slackapp);


app.get('/', (req, res) => {
  res.send('hello world');
});
app.post('/calendar', (req, res) => {
  var email = req.body.email.toLowerCase(),
      calendarObj = {
      id:req.body.id,
      details: req.body.details,
      startTime: req.body.start,
      endTime: req.body.end
    };
  logger.debug("Received Calendar Creation Request for: Email:%s Meeting Start Time: %s, Meeting End Time: %s", email,req.body.start,req.body.end );

  //logger.debug("Email:"+ email+"Meeting:"+req.body.details+"Start:"+req.body.start+"End:"+req.body.end );
//  logger.info("Meeting: ", req.body.details);
//  logger.info("Start ", req.body.start);
//  logger.info("End: ", req.body.end);
  //const dbclient = new DBClient();

  slackapp.setCalendar(email,calendarObj,function(err,result){
    if(err){
      logger.error("Unable to set calenadr: %s", err);
    }else{
      logger.debug("Successfully set calendar event %s:", result);
      res.send({ message: 'Hello World' });
    }
  });

//  res.send('hello world');
});

function usage_tip() {
    logger.warn('~~~~~~~~~~');
    logger.warn('Unified Presence');
    logger.warn('Execute your bot application like this:');
    logger.warn('clientId=<MY SLACK CLIENT ID> clientSecret=<MY CLIENT SECRET> PORT=3000 node app.js');
    logger.warn('Get Slack app credentials here: https://api.slack.com/apps')
    logger.warn('~~~~~~~~~~');
}
