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
  clientid: process.env.SLACK_CLIENT_ID,
  clientsecret: process.env.SLACK_CLIENT_SECRET,
  token: process.env.TOKEN,
  scopes: list_of_scopes
};

const http = require('http');
const app = express();
logger.debug("Overriding 'Express' logger");
app.use(require('morgan')({
  "stream": logger.stream
}));
app.use("/calendar", express.json());
app.use("/delete", express.json());
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
var slackapp = require("./slackapp.js")({
  token: admin_user_token
});


require("../slack/webclient.js")(slackapp, admin_user_token);
const botAuthorizations = require('../slack/auth.js')(app, slackapp, options);
var options_events = {
  signingsecret: process.env.SLACK_SIGNING_SECRET
}
require('../slack/events.js')(app, slackapp, options_events)
RedisExpiredEvents(slackapp);


app.get('/', (req, res) => {
  res.send('hello world');
});
app.post('/calendar', (req, res) => {
  var email = req.body.email.toLowerCase(),
    calendarObj = {
      id: req.body.id,
      details: req.body.details,
      startTime: req.body.start,
      endTime: req.body.end
    };
  logger.debug("Received Calendar Creation Request for: Email:%s Meeting Start Time: %s, Meeting End Time: %s", email, req.body.start, req.body.end);

  //logger.debug("Email:"+ email+"Meeting:"+req.body.details+"Start:"+req.body.start+"End:"+req.body.end );
  //  logger.info("Meeting: ", req.body.details);
  //  logger.info("Start ", req.body.start);
  //  logger.info("End: ", req.body.end);
  //const dbclient = new DBClient();

  slackapp.setCalendar(email, calendarObj, function(err, result) {
    if (err) {
      logger.error("Unable to set calenadr: %s", err);
      res.send({
        message: `Failed to add calendar event with error ${err}`
      });
    } else {
      logger.debug("Successfully set calendar event %s:", result);
      res.send({
        message: 'Successfully added the calendar event for user'
      });
    }
  });

  //  res.send('hello world');
});

app.post('/delete', (req, res) => {
  logger.debug("Received Calendar Deletion Request for: %s", req.body);
  var email = req.body.email.toLowerCase(),
      id = req.body.id;
  logger.debug("Received Calendar Deletion Request for: Email:%s Meeting id: %s", email, id);

  slackapp.deleteCalendar(email, id, function(err, result) {
    if (err) {
      logger.error("Unable to delete calenadr: %s", err);
      res.send({
        message: `Failed to delete calendar event with error: ${err}`
      });
    } else {
      logger.debug("Successfully deleted calendar event %s:", result);
      res.send({
        message: 'Successfully deleted calendar event'
      });
    }
  });

});

function usage_tip() {
  logger.warn('~~~~~~~~~~');
  logger.warn('Unified Presence');
  logger.warn('Execute your bot application like this:');
  logger.warn('clientId=<MY SLACK CLIENT ID> clientSecret=<MY CLIENT SECRET> PORT=3000 node app.js');
  logger.warn('Get Slack app credentials here: https://api.slack.com/apps')
  logger.warn('~~~~~~~~~~');
}
