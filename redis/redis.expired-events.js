var logger = require('../config/winston');
//import PubSub from "./pubsub";
var PubSub = require("./pubsub.js");
module.exports = function RedisExpiredEvents(slackapp) {
  PubSub.subscribe("__keyevent@0__:expired");
  PubSub.on("message", async (channel, message) => {
    // Handle event
    logger.debug("Received a Key Expiry event for channel is %s, Message is %s", channel, message);
    const [type, ns1, ns2, key] = message.split(":");
    switch (type) {
      case "reminder":
        {

          logger.debug("Reminder Type %s, NS1 %s, NS2 %s, Key %s ", type, ns1, ns2, key);

          //Fetch Users calendar

          slackapp.getCalendar(ns2, key, function(err, calendarObj) {
            if (err) {
              logger.debug("error is: ", err);
            } else {
              if (!calendarObj) {
                logger.error("In retrieving calendar Obj upon event expiration. Received an empty object. Something is wrong");
              } else {
                var user_id;
                logger.debug("Retrieved this Cal Obj %s upon event expiry ", calendarObj);
                var expiration = calendarObj.endTime - calendarObj.startTime;
                slackapp.getUser(ns2, function(err, userObj) {
                  if (err) {
                    logger.error("Was not able to receive user from the expired event");
                  } else {
                    if (!userObj) {
                      logger.error("There is some errror. I couldnt find the user for updating status ");

                    } else {
                      logger.info("received user from expired event: ", userObj.id);
                      logger.debug("Setting users Status with expiration: ", expiration);
                      //userObj.id;
                      //Once a meeting event has "expired" check to see if  user
                      //has setup a status manually on Slack, if so ignore this event
                      //If not, update user status and set status expiration as
                      //meeting end time.
                      if (!userObj.status_set) {
                        var status = {
                          status_text: calendarObj.details,
                          status_emoji: ":star:",
                          status_expiration: expiration
                        };
                        var web = slackapp.slackclient();
                        web.users.profile.set({
                            profile: status,
                            user: userObj.slackid
                          })
                          .then((res) => {
                            logger.debug("res is", res);
                            //Save this updated Object again.
                            userObj.status_set = true;
                            userObj.status_expiration = expiration;
                            slackapp.saveUser(userObj, function(err, result) {

                              if (err) {
                                logger.error(
                                  'An error occurred while saving a user: ', err);
                                slackapp.trigger('error', [err]);
                              } else {
                                logger.debug("User %s Saved with udpated status: %s", userObj.id, result);
                              }
                            });
                          })
                          .catch(logger.debug);

                      } else {
                        logger.debug("User's Status is already set, so will not be updated");
                      }

                    }
                  }
                });

              }
            }
          });

          break;
        }
    }
  });
}
