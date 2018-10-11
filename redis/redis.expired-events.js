var logger = require('../config/winston');
import PubSub from "./pubsub";
export default function RedisExpiredEvents(slackapp) {
  PubSub.subscribe("__keyevent@0__:expired");
  PubSub.on("message", async (channel, message) => {
    // Handle event
    logger.debug("channel", channel)
    logger.debug("message: ", message)
    const [type, ns1, ns2, key] = message.split(":");
    switch (type) {
      case "reminder":
        {

          logger.debug("TYPE: ", type);
          logger.debug("NS1: ", ns1);
          logger.debug("NS2: ", ns2);
          logger.debug("KEY: ", key);
          var ns = ns1 + ":" + ns2;
          //Fetch Users calendar

          var value = slackapp.getCalendar(ns, key, function(err, calendarObj) {
            if (err) {
              logger.debug("error is: ", err);
            } else {
              if (!calendarObj) {
                logger.debug("Empty Calendar Obj. There is something wrong");
              } else {
                var user_id;
                logger.debug("VALUE: ", calendarObj);
                var expiration = calendarObj.endTime - calendarObj.startTime;
                slackapp.getUser(ns2, function(err, userObj) {
                  if (err) {
                    logger.debug("Was not able to receive user from the expired event");
                  } else {
                    if (!userObj) {
                      logger.debug("There is some errror. I couldnt find the user for updating status ");

                    } else {
                      logger.debug("received user from expired event: ", userObj.id);
                      logger.debug("Setting users Status with expiration: ", expiration);
                      logger.debug("Setting users details: ", calendarObj.details);
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
                            logger.debug("res is", res)
                          })
                          .catch(logger.debug);

                      } else {
                        logger.debug("User changed their status manually, so will not be updated");
                      }

                    }
                  }
                });

              }
            }
          });

          /*
                  var calendarObj = JSON.parse(value);
                  var user_id;
                  logger.debug("VALUE: ", calendarObj);
                  var expiration = calendarObj.endTime - calendarObj.startTime ;
                  slackapp.getUser(ns2,function(err,userObj){
                    if (err){
                      logger.debug("Was not able to receive user from the expired event");
                    }
                    else {
                      logger.debug("received user from expired event: ", userObj.id);
                      logger.debug("Setting users Status with expiration: ", expiration);
                      logger.debug("Setting users details: ", calendarObj.details);
                      //userObj.id;
                      //Once a meeting event has "expired" check to see if  user
                      //has setup a status manually on Slack, if so ignore this event
                      //If not, update user status and set status expiration as
                      //meeting end time.
                      if (!userObj.status_set){
                        var status = {
                          status_text:calendarObj.details,
                          status_emoji: ":star:",
                          status_expiration: expiration
                        };
                        var web = slackapp.slackclient();
                        web.users.profile.set({profile:status, user:userObj.slackid})
                        .then((res) => {
                          logger.debug("res is",res)
                        })
                        .catch(logger.debug);

                      }else{
                        logger.debug("User changed their status manually, so will not be updated");
                      }


                    }
                  });
          */



          break;
        }
    }
  });
}
