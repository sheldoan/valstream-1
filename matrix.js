var express = require('express'),
	app = express.createServer(),
	redis = require('redis'),
	redisClient = redis.createClient(),
	_ = require('underscore')._;
	
require('jade');

app.configure(function(){
	app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
	app.set('view options', {layout:false});
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "dklfj83298fhds" }));
  app.use(app.router);
});

app.get('/*.(js|css)', function(req, res){
  res.sendfile("./public"+req.url);
});

app.get('/', function(req, res){
	redisClient.lrange('rooms',0,-1, function(err, rooms) {
		if(rooms) { 
			// _.each(rooms, function(roomId) {
			// 	console.log('fetching room from redis, name: '+roomId)
			// });
			console.log(rooms);
			res.render('index');
		}
	});	
});





app.listen('8080');


