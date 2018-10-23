
exports.handler = (event, context, callback) => {

  todaysusers=[]

  now = new Date();
  groupname="license"+now.toISOString().slice(0,10).replace(/-/g,"");
  y = new Date();
  y.setDate(y.getDate()-1);
  groupnamey="license"+y.toISOString().slice(0,10).replace(/-/g,"");
  console.log("groupname",groupname)
  console.log("groupnamey",groupnamey)

  var request = require('request');
  var _ = require('lodash');
  var ua = require('universal-analytics');

  var visitor = ua('UA-105697068-1', 'LimitLicensesLambda', {strictCidFormat: false});

  groupNames = ["jira-administrators", "jira-software-users"]
  licensedUsers = ["grehae", "aarfri", "rip", "patrie", "tobmey", "mickol", "techuser", "Import", "gabkat"]
  ctr = 0
  uctr = 0
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
 

 var urls = [];
 var users = [];
 urls.length = 0;
 users.length = 0;

  maxUsers = (parseInt(event.maxUsers)) ? parseInt(event.maxUsers) : 80;
  maxUsersReport = (parseInt(event.maxUsers)) ? parseInt(event.maxUsers) : 80;
  licenseSize = (parseInt(event.licenseSize)) ? parseInt(event.licenseSize) : 100;
  testMode = (event.testMode==="true") ? true : (event.testMode==="false") ? false : true;
console.log("event.maxUsers",event.maxUsers)
console.log("maxUsers",maxUsers)

  // rootUrl = "http://devjira.oskar-ruegg.com"
  domain = (event.domain) ? event.domain : "testjira.oskar-ruegg.com";
  rootUrl = "http://"+domain

  for (i in groupNames) {
    urls.push(rootUrl+"/rest/api/2/group/member?groupname="+groupNames[i]+"&includeInactiveUsers=false&maxResults=100");
    //console.log(urls);
  }
  console.log("urls: "+urls);

  function getAlreadyRemovedUsers() {
    arurl = rootUrl + "/rest/api/2/group"
    request.post({  
      //headers: {'Content-Type' : 'application/json' },
      url:     arurl,
      json:     { "name": groupname },
      timeout: 10000
    }, function(error, response, body){
      // console.log("arurl: "+arurl);
      if (error) {
        console.log("error: "+error); 
        var arjsr = JSON.stringify({});
      } else {
        // console.log("body:" + body);
        // console.log("response:" + response);
        var arjsr = JSON.stringify(body);
        // console.log("arjsr:" + arjsr);
      }
      ardurl = rootUrl + "/rest/api/2/group?groupname="+groupnamey
      request.delete({  
        headers: {'Content-Type' : 'application/json' },
        url:     ardurl,
        timeout: 10000
      }, function(error, response, body){
        console.log("removed",body)
      }).auth('techuser','techuser',true);
      argurl = rootUrl + "/rest/api/2/group/member?groupname="+groupname
      request.get({  
        headers: {'Content-Type' : 'application/json' },
        url:     argurl,
        timeout: 10000
      }, function(error, response, body){
        if (error) {
          console.log("error: "+error); 
          console.log("url: "+url);
          console.log("error.code: "+error.code); 
          console.log("error.connect: "+error.connect); 
          console.log("error: "+error); 
          callback(null, "Script Error");
        } else {
          // console.log("body:" + body);
          // console.log("response:" + response);
          var arjsrg = JSON.parse(body);
          // console.log("arjsrg:", arjsrg.values);
          arjsrg.values.forEach( function loopUsers(user,index, array, done){
            // console.log("user.key:",user.key)
            todaysusers.push(user.key)
          })
        }
      }).auth('techuser','techuser',true);
    }).auth('techuser','techuser',true);
  }
  getAlreadyRemovedUsers()


  function sortUsersByPi(a, b) {
    a = parseInt(a["pi"])
    b = parseInt(b["pi"])
    return a > b ? 1 : b > a ? -1 : 0;
  }

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
        // console.log("body:",body);
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
    //console.log("users: ",users)
    // console.log("users.length: ",users.length)
    users = _.uniqBy(users, "name");
    usersBefore = users.length;
    licensedUsers = licensedUsers.concat(todaysusers)
    // console.log("licensedUsers",licensedUsers)
    licensedUsers.forEach ( function (user, index, array, done) { /* console.log("user: ",user); */ users = users.filter(function(obj) { return obj.name !== user; } ); maxUsers--; }) 
    // here the magical sorting needs to happen :-)
    users = users.sort(sortUsersByPi)
    //console.log("users: ",users)
    // var sortedPIs=sortProperties(cities);
    users.reverse()
    if(users[0].pi<1) {
      console.log("no order")
      users = _.shuffle(users)
    }
    // console.log(users)
    users = users.slice(maxUsers)
    console.log(users)
    console.log("users.length: ",users.length)
    usersAfter = usersBefore - users.length
    if(users.length<1) {
      console.log("number of users is smaller than allowed users - no action required")

            console.log("maxUsersReport",maxUsersReport)
            console.log("usersBefore",usersBefore)
            console.log("usersAfter",usersAfter)
            visitor.set('cm1', maxUsersReport);
            visitor.set('cm2', usersBefore);
            visitor.set('cm3', usersAfter);
      visitor.pageview("/Lambda/LimitLicensedUsers", "http://jira.oskar-ruegg.com/", "Lambda - Limit Licensed Users").send()

      setTimeout(function () { callback(null, 'Script Successful'); }, 1000)
    }
    users.forEach ( function loopUsers(user,index, array, done){
      //console.log(user.name)
      // console.log("user.url: ",user.url)
      if(user.url==undefined) {
        uctr++;
        if(array.length === uctr) 
            callback(null, 'Script Successful');
      } else {
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
          agurl = rootUrl + "/rest/api/2/group/user?groupname="+groupname
          request.post({  
            //headers: {'Content-Type' : 'application/json' },
            url:     agurl,
            json:     { "name": user.name },
            timeout: 10000
          }, function(error, response, body){
            console.log("group add error:",error)
            console.log("group add body:",JSON.stringify(body))
          }).auth('techuser','techuser',true);
          uctr++;
          if(array.length === uctr) {

            console.log("maxUsersReport",maxUsersReport)
            console.log("usersBefore",usersBefore)
            console.log("usersAfter",usersAfter)
            visitor.set('cm1', maxUsersReport);
            visitor.set('cm2', usersBefore);
            visitor.set('cm3', usersAfter);
            visitor.pageview("/Lambda/LimitLicensedUsers", "http://jira.oskar-ruegg.com/", "Lambda - Limit Licensed Users").send()

            setTimeout(function () { callback(null, 'Script Successful'); }, 1000)
          }
        }).auth('techuser','techuser',true);
      } else {
        console.log("test mode... licenses NOT removed")
        uctr++;
        if(array.length === uctr) 
          callback(null, 'Script Successful');
      } 
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
        callback(null, "Script Error");
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
            users.push({name: current, date: "", pi: ustat, url: url});
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

