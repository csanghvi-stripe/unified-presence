Initialize using signing secret from environment variables
UserObj build upon app installation, saves all info on user
in redis: <userId, UserObj> (set) (get) (getAll)
Anytime team_join event is fired, user is created on SlackStrategy
Lookup table for a users presence updated on Slack. Anytime a user updates slack status, set a flag for that user
This flag will be checked, if it is not set, than only we will allow our app to update someones status
We may choose to use hmset for User record, so that under name space user-info, we will store
Key1-value1 as id-userobj, key2-value2 as flag true/false

setReminder/setMeeting function is called for every meeting for every users
this will add a users calendar into redis as <userid> (NS) timestamp <key> Meeting Obj <Value>. This will be a multi-hash
with all meetings for users
As part of making a setReminder call, caller will also pass an expire parameter
This parameter will be calculated by Caller based on  Meeting Time stamp - current timestamp
