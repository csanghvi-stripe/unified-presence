/*
 * Sign-in
 * This part is only needed for distributing your app.
 * Internal integrations do not require the user sign in. You just install it on your workspace!
 */
var logger = require('../config/winston');
var request = require('request');
var path = require('path');
const apiUrl = 'https://slack.com/api/';

module.exports = function(app, slackapp, options) {

var call_api = function(command, options, cb) {



  logger.info('** API CALL: %s %s' ,apiUrl , command);
  request.post(apiUrl + command, function(error, response, body) {
  logger.info('Got response Error: %s, Body: %s ' ,error, body);
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      if (json.ok) {
        if (cb) cb(null, json);
      } else {
        if (cb) cb(json.error, json);
      }
    } else {
      if (cb) cb(error);
    }
  }).form(options);
};

var oauth_access = function(options, cb) {
  call_api('oauth.access', options, cb);
};

var auth_test = function(options, cb) {
  call_api('auth.test', options, cb);
};

app.get('/login', (req, res) => {
  res.send(`<a href="https://slack.com/oauth/authorize?client_id=${options.clientid}&scope=${options.scopes}"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>`)
  //  res.send('<a href="/auth"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>');
});

app.get('/oauth', (req, res) => {
    if (!req.query.code) { // access denied
      res.redirect('/?error=access_denied');
      return;
    }
    var team_id;
    const authInfo = {
      client_id: options.clientid,
      client_secret: options.clientsecret,
      code: req.query.code
    };

    oauth_access(authInfo, function(err, auth) {

        if (err) {
          logger.critical("Error occurred in Auth flow");
          res.status(500).send(err);
          slackapp.trigger('oauth_error', [err]);
        } else {
          /*
           {
             ok: true,
             access_token: 'xoxp',
             scope: 'identify,bot,users:read,dnd:read,users.profile:read,chat:write:user,users:write,dnd:write,users.profile:write,identity.basic',
             user_id: '',
             team_name: '',
             team_id: '',
             bot: {
               bot_user_id: '',
               bot_access_token: 'xoxb'
             }
           }
          */
          var scopes = auth.scope.split(/\,/);
          auth_test({
            token: auth.access_token
          }, function(err, identity) {

            if (err) {
              logger.critical("Error occurred in Auth flow");
              res.status(500).send(err);
              slackapp.trigger('oauth_error', [err]);

            } else {
              req.identity = identity;

              // we need to deal with any team-level provisioning info
              // like incoming webhooks and bot users
              // and also with the personal access token from the user

              team_id=auth.team_id;
              slackapp.findTeamById(auth.team_id, function(err, teamObj) {
                if (err) {
                  logger.error('An error occurred while looking up a team: %s', err);
                }
                logger.debug("findTeamById returned Team Obj as: %s", teamObj);
                var is_new = false;
                if (!teamObj) {
                  is_new = true;
                  teamObj = {
                    id: auth.team_id,
                    name: auth.team_name
                  };
                }
                teamObj.bot = {
                  bot_token: auth.bot.bot_access_token,
                  user_id: auth.user_id,
                  createdBy: auth.user_id,
                  user_token: auth.access_token,
                  scopes: auth.scopes
                };

                slackapp.storage.teams.save(teamObj, function(err, result) {
                  if (err) {
                    logger.error('An error occurred while saving a team: %s', err);
                    slackapp.trigger('error', [err]);
                  } else {
                    logger.debug("Team Saved %s", result);
                    slackapp.storage.users.get(auth.user_id, function(err, user) {
                      if (err) {
                        logger.error('An error occurred while looking up a user: ' + err);
                        slackapp.trigger('error', [err]);
                      } else {
                        var new_user = false;
                        if (!user) {
                          new_user = true;
                        }
                        user = {
                          id: auth.user_id,
                          team_id: auth.team_id,
                          user: identity.user,
                          access_token: auth.access_token,
                          scopes: scopes
                        };
                        slackapp.storage.users.save(user, function(err, result) {

                          if (err) {
                            logger.debug(
                              'An error occurred while saving a user: %s', err);
                            slackapp.trigger('error', [err]);
                          } else {
                            logger.debug("User Saved %s", result);
                            slackapp.trigger('auth', [auth.access_token, auth.bot.bot_access_token]);
                            if (new_user) {
                              slackapp.trigger(
                                'create_user',
                                [user]
                              );
                            } else {
                              slackapp.trigger(
                                'update_user',
                                [user]
                              );
                            }
                          }
                        });
                      }
                    });
                  }
                });
              });
            }
          });
        }
      });
      //Send response
    res.sendFile(path.resolve('public/thanks.html'));
  });
  }

  // This link will open the workspace in Slack client,
  // however, I am calling extra API for the tutorial to show you how to use Web API.
  // res.redirect(`slack://open?team=${team_id}`);

  // When you call Web APIs, you need to check if your access_token (xoxa-) is expired (60min) and if it is, get a fresh access token with your refresh_token (xoxr-).
  // However, in this scenario, because you are calling this API immediately after the initial OAuth, access_token is not expired thus you can just use it.
  // See the additional code sample in the end of this file.
