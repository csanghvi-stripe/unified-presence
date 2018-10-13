var logger = require('../config/winston');
module.exports = function(slackapp, token) {
  logger.debug(token)
  var web = slackapp.slackclient(token);

  slackapp.on('auth', function(...opts) {
    //accesstoken, team, extra, profile
    logger.debug("Event Fired: %s", opts);
    var slackweb = slackapp.slackclient(opts[1]);
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
            logger.debug("User Obj is: %s",userObj);
            //  users.push(userObj);
            //slackapp.dbclient.set(userObj.email, JSON.stringify(userObj));
            slackapp.saveUser(userObj, function(err, result) {
              if (err) {
                logger.error("Something went wrong in saving user obj", err);
              } else {
                logger.debug("User %s saved successfully", userObj.id);
              }
            });

          }
        }

      })
      .catch(logger.error);



  });


}
