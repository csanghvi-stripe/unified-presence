We are going to sue three redis data store:

Namespace: slackapp:store:teams key=team.id value=teamObj
           slackapp:store:users key=user.id value=UserInfo (that includes access token)
Namespace: slackapp:userstore:users key=user.email value=UserObj
Namespace: calendar:<email> key1=meetingid, value1=CalendarObj,key2=value2, key3=value3...
```
UserObj = {
  id,
  email,
  slackid,
  status_set,
  status_expiration  
}

CalendarObj = {
  id,
  details,
  startTime,
  endTime
}
```
Client Modules will be using "SlackApp" module to interface with Redis & Slack Web Client.

An example usage of setCalendar API call for storing user calendar information is below:
```
slackapp.setCalendar(useremail,calendarObj,function(err,result){
  if(err){
    logger.error("Unable to set calenadr:"+err);
  }else{
    logger.debug("Successfully set calendar event:"+ result);
  }
});
```

An example of accessing a users calendar is below:
ns = NameSpace  = "calendar:<email>""
key = Meeting ID. Currently, defaulting all meeting IDs to be 123. We can change it to be the startTime (But if multiple meetings start at same tme, it will result in collision)
```
slackapp.getCalendar(ns, key, function(err, calendarObj) {
  if (err) {
    logger.debug("error is: ", err);
  } else {
    if (!calendarObj) {
      logger.debug("Empty Calendar Obj. There is something wrong");
    } else {
      var user_id;
      logger.debug("VALUE: ", calendarObj);
    });
```

UserObj is constructed at time of App installation on a WS. It relies on users.list() slack API method call.
And it fetches list of all users on the workspace.
Subsequently, any time a user's status changes based on a "user_change" event from Slack, (Which can be fired either if a user changes their status manually, or if status is changed via an API call), the userObj is updated with user's status_set flag & expiration of status.

For every setCalendar call we are storing another key-value on redis which has expiry = [Now - MeetingStartTime]. Redis will expire this dummy key & our RedisExpiredEvents handler will catch the expiration. The key-space notification expiration only returns the key. That is why this "expired" key is constructed as: reminder:<ns(calendar:email)>:<key(meetingID)>

Everytime a key expires, we use the key to get the actual namespace & key of the calendarObj against which this key was created.
And based off that we get the userobj, this object tells us whether the user's status was previously set (manually or otherwise)
If it was set, then we do not call web.users.profile.set call, else we make the call to Slack to udpate user status.
In order to make this API call on Slakc, we are using user token of the Admin (Generated from Legacy TOkens)
