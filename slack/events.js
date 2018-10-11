var logger = require('../config/winston');

const slackEventsApi = require('@slack/events-api');

module.exports = function(app, slackapp, options) {

  // *** Initialize event adapter using signing secret from environment variables ***
  const slackEvents = slackEventsApi.createEventAdapter(options.signingsecret, {
    includeBody: true
  });

  // Mount the event handler on a route
  // NOTE: you must mount to a path that matches the Request URL that was configured earlier
  app.use('/slack/events', slackEvents.expressMiddleware());

  // Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
  slackEvents.on('message', (event) => {
    logger.debug(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);
  });

  // Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
  slackEvents.on('user_change', (event) => {
    logger.debug(`Received a user_change event: user ${event.user.profile.email} & status expiration ${event.user.profile.status_expiration}`);

    //logger.debug(`Received a user_change event:  payload:`, event);
    //Once an event is received for change in user status
    //it could be someone added user status or removed it
    //event.user.id
    //event.enterprise_user.id
    //event.enterprise_user.teams
    //event.user.profile.email
    //event.user.profile.status_expiration

    //Get UserObj from

    slackapp.getUser(event.user.profile.email, function(err, userObj) {
      if (err) {
        logger.debug('An error occurred while saving a user: ', err);
        slackapp.trigger('error', [err]);
      } else {
        if (!userObj) {
          logger.debug("This shouldnt have happened. Something is wrong, because every user who changes status, should be found in db ");
        }
        logger.debug("User found in db: ", userObj);
        userObj.status_expiration = event.user.profile.status_expiration;
        if (event.user.profile.status_expiration != 0) {
          userObj.status_set = true;
        } else {
          userObj.status_set = false;
          userObj.status_expiration = event.user.profile.status_expiration;
        }


        //Save this updated Object again.
        slackapp.saveUser(userObj, function(err, result) {

          if (err) {
            logger.debug(
              'An error occurred while saving a user: ', err);
            slackapp.trigger('error', [err]);
          } else {
            logger.debug("User Saved with udpated status: ", result);
          }
        });
      }

    });

  });

  // Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
  slackEvents.on('team_join', (event) => {
    logger.debug(`Received a team_join event: ${event}`);
    //As soon as a new user joins the workspace,
    //Take the user and add to database userstore

  });

  // Handle errors (see `errorCodes` export)
  slackEvents.on('error', console.error);

}
