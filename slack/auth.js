// Initialize Add to Slack (OAuth) helpers
var logger = require('../config/winston');

const passport = require('passport');
const SlackStrategy = require('@aoberoi/passport-slack').default.Strategy;

module.exports = function(app, slackapp, options) {


passport.use(new SlackStrategy({
  clientID: options.clientid,
  clientSecret: options.clientsecret,
  skipUserProfile: false,
}, (accessToken, scopes, team, extra, profiles, done) => {
  logger.debug("accessToken: "+accessToken+"team:"+ team+"extra"+extra+"profiles"+profiles);

//  logger.debug("team:", team)
//  logger.debug("extra", extra)
//  logger.debug("profiles",profiles)


  var options_webclient = {
    token: accessToken
  };

  slackapp.findTeamById(team.id, function(err, teamObj) {
    if (err){
      logger.error('An error occurred while saving a team: '+ err);
    }
    logger.debug("Team Obj is: "+ teamObj);
     var is_new = false;
     if (!teamObj){
       is_new = true;
       teamObj = {
         id:team.id,
         name:team.name
       };
     }
     teamObj.bot = {
         token: extra.bot.accessToken,
         user_id: extra.bot.id,
         createdBy: profiles.user.id,
         appToken: accessToken,
         scopes:scopes
     };

       slackapp.storage.teams.save(teamObj, function(err, result) {
          if (err) {
            logger.error('An error occurred while saving a team: '+ err);
            slackapp.trigger('error', [err]);
          } else {
            logger.debug("taem Saved"+ result);
            slackapp.storage.users.get(profiles.user.id, function(err, user) {
              if (err) {
                  logger.error('An error occurred while saving a user: '+err);
                  slackapp.trigger('error', [err]);
                }else{
                  var new_user = false;
                  if (!user){
                    new_user=true;
                  }
                  user = {
                      id: profiles.user.id,
                      team_id: team.id,
                      user: profiles.user.name,
                      accessToken:accessToken,
                      scopes:scopes
                  };
                  slackapp.storage.users.save(user, function(err, result) {

                    if (err) {
                        logger.debug(
                            'An error occurred while saving a user: '+ err);
                        slackapp.trigger('error', [err]);
                    } else {
                      logger.debug("User Saved"+ result);
                      slackapp.trigger('auth', [accessToken, team, extra, profiles]);
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



  done(null, {});
}));
// Plug the Add to Slack (OAuth) helpers into the express app
app.use(passport.initialize());

app.get('/login', (req, res) => {
  res.send('<a href="/auth/slack"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>');
});
app.get('/auth/slack', passport.authenticate('slack', {
  scope: options.scopes
}));
app.get('/oauth',
  passport.authenticate('slack', { session: false }),
  (req, res) => {
    res.send('<p>Unified Presence was successfully installed on your team.</p>');
  },
  (err, req, res, next) => {
    res.status(500).send(`<p>Failed to install Unified Presence</p> <pre>${err}</pre>`);
  }
);


}
