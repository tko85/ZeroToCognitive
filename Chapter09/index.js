/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*
 * Zero to Cognitive Chapter 9
 */
var express = require('express'); //web server framework
var http = require('http');       //http handler functions
var https = require('https');
var path = require('path');     //directory path type functions
var fs = require('fs');         //file functions
var mime = require('mime');     //determines mime type from path extension
var bodyParser = require('body-parser');  //parses html request body (used with Post/Put methods when there is content in the message body)
var cfenv = require('cfenv');

var cookieParser = require('cookie-parser');  //parses cookies and populates a req.cookies object
var session = require('express-session');
var cloudant = require('cloudant');
var myDB = require('./controller/restapi/features/cloudant_utils');
myDB.authenticate(myDB.create, '');
var sessionBase  = require('./controller/sessionManagement');
var sessionStore = Object.create(sessionBase.SessionObject);

var vcapServices = require('vcap_services');
var uuid = require('uuid');
var env = require('./controller/env.json'); //holds environmental variables for the controller js files
var sessionSecret = env.sessionSecret;
var gmailCredentials = env.gmail;
var appEnv = cfenv.getAppEnv();
var app = express();    //the application that Express is acting as web server for
var busboy = require('connect-busboy'); // parses multi-part request bodies e.g. multiple files
app.use(busboy());  //app.use mounts middleware function.  Since no path argument provided, it is invoked for each request

// the session secret is a text string of arbitrary length which is
//  used to encode and decode cookies sent between the browser and the server
/**
for information on how to enable https support in osx, go here:
  https://gist.github.com/nrollr/4daba07c67adcb30693e
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
**/
if (cfenv.getAppEnv().isLocal == true)
{
  var pkey = fs.readFileSync('key.pem');
  var pcert = fs.readFileSync('cert.pem')

  var httpsOptions = { key: pkey, cert: pcert };
} else {
  app.enable('trust proxy');    //this property designates if a proxy is being used
  app.use (function (req, res, next) {
          if (req.secure) {next();}   //req.secure is an Express property of the request object
          else {res.redirect('https://' + req.headers.host + req.url);}
  });
}

app.use(cookieParser(sessionSecret));   //mounts middlware to any call
app.use( session( {                     //mounts middleware to any call path
    store: sessionStore,
    secret: sessionSecret, resave: false, saveUninitialized: true,
    cookie: {secure: true, maxAge:24*60*60*1000},
    genid: function (req) {return uuid.v4()}
  }));
app.get('/login*', function (req, res) {console.log("login session is: "+req.session); loadSelectedFile(req, res);});   //for any get method with path beginning with /login, executes this function


app.use(bodyParser.urlencoded({ extended: true }));  //mounts middleware that only parses `urlencoded` bodies.
app.use(bodyParser.json());  //mounts middleware that parses only parses json
app.set('appName', 'z2c-chapter09');
app.set('port', appEnv.port);

app.set('views', path.join(__dirname + '/HTML')); /*The directory where template files are found.  __dirname is a object local to each module.  The directory name of the current module. This the same as the path.dirname() of the __filename.*/
app.engine('html', require('ejs').renderFile);  //ejs template engine mapped to all calls to html files
app.set('view engine', 'ejs');  //view engine for using embedded javascript templates
app.use(express.static(__dirname + '/HTML'));  /*This is the only built-in middleware function in Express. It serves static files and is based on serve-static.*/
app.use(bodyParser.json());

// Define your own router file in controller folder, export the router, add it into the index.js.
// app.use('/', require("./controller/yourOwnRouter"));

app.use('/', require("./controller/restapi/router"));

if (cfenv.getAppEnv().isLocal == true)
  {
    https.createServer(httpsOptions, app).listen(app.get('port'),
        function(req, res) {console.log(app.get('appName')+' is listening on port: ' + app.get('port'));});
  }
  else
  {
    var server = app.listen(app.get('port'), function() {console.log('Listening on port %d', server.address().port);});  /*starts a socket and listens for connections on host and port.  Identical to Node's http.Server.listen()*/
  }
/*
*/
function loadSelectedFile(req, res) {
    var uri = req.originalUrl;  /*This property is much like req.url; however, it retains the original request URL, allowing you to rewrite req.url freely for internal routing purposes. For example, the “mounting” feature of app.use() will rewrite req.url to strip the mount point.*/
    var filename = __dirname + "/HTML" + uri;
    fs.readFile(filename,         /*Asynchronously reads the entire contents of a file.  The callback is passed two arguments (err, data), where data is the contents of the file.*/
        function(err, data) {
            if (err) {
                console.log('Error loading ' + filename + ' error: ' + err);
                return res.status(500).send('Error loading ' + filename);
            }
            var type = mime.lookup(filename);
           res.setHeader('content-type', type);
            res.writeHead(200);
            res.end(data);
        });
}
function displayObjectValues (_string, _object)
{
  for (prop in _object){
      console.log(_string+prop+": "+(((typeof(_object[prop]) == 'object') || (typeof(_object[prop]) == 'function'))  ? typeof(_object[prop]) : _object[prop]));}
}
