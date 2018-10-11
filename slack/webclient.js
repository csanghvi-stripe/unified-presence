var logger = require('../config/winston');
module.exports = function(slackapp, token) {
  logger.debug(token)
  var web = slackapp.slackclient(token);

  slackapp.on('auth', function(...opts) {
    //accesstoken, team, extra, profile
    logger.debug("Event Fired", opts);
    var slackweb = slackapp.slackclient(opts[2].bot.accessToken);
    // https://api.slack.com/methods/users.identity
    var users = [];
    slackweb.users.list()
      .then((res) => {
        // `res` contains information about the user. the specific structure depends on the scopes your app was allowed.

        //logger.debug(res);
        
        for (var i = 0, len = res.members.length; i < len; i++) {
          if (res.members[i].is_bot === false && res.members[i].id != "USLACKBOT") {
            let userObj = {
              slackid: res.members[i].id,
              id: res.members[i].profile.email.toLowerCase(),
              name: res.members[i].name,
              email: res.members[i].profile.email.toLowerCase(),
              status_set: false,
              status_expiration: 0
            };
            logger.debug(userObj);
            //  users.push(userObj);
            //slackapp.dbclient.set(userObj.email, JSON.stringify(userObj));
            slackapp.saveUser(userObj, function(err, result) {
              if (err) {
                logger.debug("Something went wrong in saving user obj", err);
              } else {
                logger.debug("User saved successfully");
              }
            });
            /* Use the below format whenever setting a users calendar
            let value = {
              meeting: "Working with Client",
              startTime: "1539025832",
              endTime:"1539025862"
            };
            var namespace = "calendar:"+userObj.email;
            //slackapp.dbclient.setReminder(namespace,"123", JSON.stringify(value), 10+i);
            slackapp.setCalendar(userObj);

            */
          }
        }
        /*
        let value = {
          meeting: "Working with Client",
          startTime: "1539025832",
          endTime:"1539025862"
        };
        //slackapp.dbclient.setReminder("userObj@email.com","123", JSON.stringify(value), 10);

        //logger.debug(users);
        */
      })
      .catch(logger.debug);



  });


}
