# PushNotification
Fires push notifications to all users with same gender within the same state or same city

Database Structure (NOSQL)

Users
  |-{userId}\
        |-"token": {tokenString},
        |-"PreferenceNotification": {Bool},
        |-"signedIn": {Bool}
        |- ...
        
UserPreference
      |-"location"
            |-{address} (ex) "Anaheim, CA, United States"
                  |- {userId}
                        |-"gender": {Male/Female} .indexBy
      |-"category"
            |-{category} (ex) "Movie"
                  |- {userId}
                        |-"gender": {Male/Female} .indexBy              

PreferenceByState
       |-{state} (ex) "CA"
            |-{userId}
                  |-"gender": {Male/Female} .indexBy
                  
Request
   |-{requestId}
          |-"address": {address} (ex) "Anaheim, CA, United States"
          |-"category": {category} (ex) "Movie"
          |-"lookingFor": {Male/Female/Anyone}
          |- ...
          
