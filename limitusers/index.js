var request = require('request');
var _ = require('lodash');

rootUrl = "http://devjira.oskar-ruegg.com"
groupNames = ["jira-administrators", "jira-software-users"]
var urls = [];
var users = [];
maxUsers = 80
licenseSize = 100
ctr = 0
uctr = 0

for (i in groupNames) {
  urls.push(rootUrl+"/rest/api/2/group/member?groupname="+groupNames[i]+"&includeInactiveUsers=false&maxResults=100");
  //console.log(urls);
}
console.log("urls: "+urls);


exports.handler = (event, context, callback) => {

  function identifyUsers() {
    users = _.uniqBy(users, "name");
    users = users.slice(maxUsers)
    // console.log(users)
    console.log("users.length: "+users.length)
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
      // console.log(user.name)
      // console.log("url: "+url)
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
    })
  }

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
            users.push({name: current, date: "", url: url});
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

  
};

