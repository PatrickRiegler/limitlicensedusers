var request = require('request');
var _ = require('lodash');

// rootUrl = "http://devjira.oskar-ruegg.com"
rootUrl = "http://testjira.oskar-ruegg.com"
groupNames = ["jira-administrators", "jira-software-users"]
licensedUsers = ["grehae", "aarfri", "rip", "patrie", "tobmey", "mickol", "techuser", "Import"]
var urls = [];
var users = [];
maxUsers = 60
licenseSize = 100
ctr = 0
uctr = 0
testMode = true;
gaurl="https://www.googleapis.com/analytics/v3/data/ga?ids=ga%3A159202622&start-date=30daysAgo&end-date=today&metrics=ga%3Apageviews&dimensions=ga%3Adimension1&sort=-ga%3Apageviews"
// gaurlauth="&access_token=ya29.GlsQBoT5cMe6nr1a03M1qDxv47iJq4OfNmGS-gFzYtgTdvr5Gav2fV0MYI-i2ycVDUE7hPh4hqTtda6141TOylWGUS8hcZPVgmmDqBAnXwap_Q-hFny8-00TrHUE"
gaurlauth=""
ustats=[];


var prettyjson = require('prettyjson'); // Un-uglify JSON output
var {google} = require('googleapis');
var key = require('./auth.json'); // Downloaded JSON file
 
var viewID = 'ga:159202622'; // Google Analytics view ID
var analytics = google.analyticsreporting('v4'); // Used for pulling report
var jwtClient = new google.auth.JWT(key.client_email, // For authenticating and permissions
                                    null,
                                    key.private_key,
                                    ['https://www.googleapis.com/auth/analytics.readonly'],
                                    null);
 

for (i in groupNames) {
  urls.push(rootUrl+"/rest/api/2/group/member?groupname="+groupNames[i]+"&includeInactiveUsers=false&maxResults=100");
  //console.log(urls);
}
console.log("urls: "+urls);


exports.handler = (event, context, callback) => {

  function getUserStats() {
    return new Promise((resolve,reject) => {
    request.get({
      headers: {'Content-Type' : 'application/json' },
      url:     gaurl+gaurlauth,
      timeout: 10000
    }, function(error, response, body){
      if (error) {
        console.log("url: ",gaurl);
        console.log("error.code: ",error.code);
        console.log("error.connect: ",error.connect);
        console.log("error: ",error);
        reject("error:",error)
      } else {
        console.log("body:",body);
        // console.log("successful: ",gaurl);
	usb=JSON.parse(body);
	usr=usb.rows
        // console.log("usr length:",usr.length)
        if(usr.length>0) {
          for (i = 0; i < usr.length; i++) { 
            current = usr[i];
            // console.log("current0: ",current[0])
            // console.log("current1: ",current[1])
            ustats[current[0]] = current[1];
          }
        }
        resolve(body)
      } // else

      // console.log("yes, executed")

    });
    });
  }


  function identifyUsers() {
    users.sort((a, b) => parseFloat(a.pi) - parseFloat(b.pi))
    users = _.uniqBy(users, "name");
    licensedUsers.forEach ( function (user, index, array, done) { /* console.log("user: ",user); */ users = users.filter(function(obj) { return obj.name !== user; } ); maxUsers--; }) 
    users.reverse()
    if(users[0].pi<1) {
      console.log("no order")
      users = _.shuffle(users)
    }
    // console.log(users)
    users = users.slice(maxUsers)
    console.log(users)
    console.log("users.length: ",users.length)
    if(users.length<1) {
      console.log("number of users is smaller than allowed users - no action required")
      callback(null, 'Script Successful');
    }
    users.forEach ( function loopUsers(user,index, array, done){
      //console.log(user.name)
      groupName = user.url.substring(user.url.indexOf("groupname")+10)
      groupName = groupName.substring(0,groupName.indexOf("&"))
      // console.log("groupName: "+groupName)
      url = rootUrl + "/rest/api/2/group/user?groupname="+groupName+"&username="+user.name
      console.log(user.name)
      console.log("url: "+url)
      if(!testMode) {
        request.delete({  
          headers: {'Content-Type' : 'application/json' },
          url:     url,
          timeout: 10000
        }, function(error, response, body){
          //console.log("body:" + body);
          console.log("deleted group "+groupName+" for user "+user.name)
          uctr++;
          if(array.length === uctr) 
            callback(null, 'Script Successful');
        }).auth('techuser','techuser',true);
      } else {
        console.log("test mode... licenses NOT removed")
        uctr++;
        if(array.length === uctr) 
          callback(null, 'Script Successful');
      } 
    })
  }

  function startLoop() {
  urls.forEach ( function loopUrls(url,index, array, done){
    request.get({  
      headers: {'Content-Type' : 'application/json' },
      url:     url,
      timeout: 10000
    }, function(error, response, body){
      if (error) {
        console.log("url: "+url);
        console.log("error.code: "+error.code); 
        console.log("error.connect: "+error.connect); 
        console.log("error: "+error); 
        callback(null, error);
      } else {
        // console.log("body:" + body);
        // console.log("successful: "+url);
        var jsi = JSON.parse(body);
        if(jsi.total>licenseSize) {
          console.log("bigger than licenseSize - immediate action required!")
        } else {
          // loop over all users with a license
          for (i = 0; i < jsi.values.length; i++) { 
            current = jsi.values[i].name;
            // console.log("current: "+current)
            // console.log("ustats[current]: "+ustats[current])
            // console.log("ustats[aarfri]: ",ustats["aarfri"])
            ustat = (ustats[current]>0) ? ustats[current] : 0;
            users.push({name: current, date: "", pi: ustat, surl: url});
          }
        }
	if(jsi.nextPage!=undefined) {
            console.log("nextPage: "+jsi.nextPage)
            ctr--;
            loopUrls(jsi.nextPage,0,urls,done)
        }
        ctr++;
        if(array.length === ctr) 
          identifyUsers();
      } // else
  
      // console.log("yes, executed")
  
    }).auth('techuser','techuser',true);
  })
  }

jwtClient.authorize(function (err, tokens) {
  if (err) {
    console.log('Reeeeejected');
    console.log(err);
    return;
  } else {
    console.log('Yup, we got authorized!');
    console.log("tokens: ", tokens.access_token)
    gaurlauth = "&access_token="+tokens.access_token
  }

  getUserStats(1).then(setTimeout(function () { startLoop() },1000));
});
  
};
