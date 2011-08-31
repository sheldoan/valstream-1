var express = require('express'),
	app = express.createServer(),
	io = require('socket.io').listen(app),
	redis = require('redis'),
	redisClient = redis.createClient(),
	_ = require('underscore')._;
	
require('jade');

io.configure(function () {
	io.set('log level', 2); 
})

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
			res.render('index', {rooms: rooms});
		}
	});	
});

io.sockets.on('connection', function(socket) {
	
	socket.on("room:getVALPlaylist", function(data) {
		var rID = data.room;
		if (redisClient) {
			redisClient.lrange("room:" + rID + ":val:playlist",0,-1, function(err, reply) {
				if (err) {
					console.log("Error trying to fetch VALs playlist: " + err);
				} else {
					console.log("Got VALs List: " + reply)
					socket.emit("val:playlistResults", reply);
				}
			});
		}
	});
	
	socket.on("room:addToVALPlaylist", function(data) {		
		var rID = data.room, vID = data.video;
		if (redisClient) {
			console.log("pushing to: " + "room:" + rID + ":val:playlist")
			redisClient.lpush("room:" + rID + ":val:playlist", vID,function(err, reply) {
				if (err) {
					console.log("Error trying to fetch VALs playlist: " + err);
				} else {
					console.log("Added to VALs list: " + reply)
				}
			});
		}
	});
	
});



app.listen(4000);


