var express = require('express'),
	app = express.createServer(),
	io = require('socket.io').listen(app),
	redis = require('redis'),
	redisClient = redis.createClient(),
	_ = require('underscore')._,
	Backbone = require('backbone');
	
var models = require('./models');
	
require('jade');

io.configure(function () {
	io.set('log level', 2); 
})

//------------------------------------------------------

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
			console.log(rooms);
			res.render('index', {rooms: rooms});
		}
	});	
});

//------------------------------------------------------

var subZion = redis.createClient();

subZion.on('ready', function() {
	subZion.subscribe('zion');
})

var roomMgr = new models.RoomManager();
var postMan = new models.PubSubPostMan();

io.sockets.on('connection', function(socket) {

	socket.on('room:getHistory', function(data) {
		var roomName = data.room;
		redisClient && redisClient.lrange('room:'+roomName+':history', 0, -1, function(err, videos) {
			if(err) return;
			
			var data = { room: roomName, videos: JSON.parse(videos) };
			socket.emit('room:sendHistory', JSON.stringify(data));
		})
	})
	
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
	
	//https://gdata.youtube.com/feeds/api/videos/t1IiUAtoNBk?v=2&alt=jsonc
	socket.on("room:addToVALPlaylist", function(data) {		
		var rID = data.room, vID = data.video;
		console.log("pushing to: " + "room:" + rID + ":val:playlist")
		
		var options = { 
			host: 'gdata.youtube.com',
			port: 80,
			path: '/feeds/api/videos/'+videoId+'?v=2&alt=jsonc'
		};
		
		var req = http.request(options, function(res) {
		  res.setEncoding('utf8');
			var videoData = '';
		  res.on('data', function (chunk) {
		    videoData += chunk;
		  });
		
			res.on('end', function() {
				videoData = JSON.parse(videoData);
				
				videoData = videoData['data']
				var currVideo = {
					id: videoData['id'],
					title: videoData['title'],
					thumb: videoData['sqDefault'],
					author: videoData['uploader'],
					duration: videoData['duration'],
				}
			});
		});

		req.on('error', function(e) {
		  console.log('['+roomName+'][VAL] playVideo(): *** ERROR *** ' + e.message);
		});
		req.end();
		
		redisClient.lpush("room:" + rID + ":val:playlist", vID,function(err, reply) {
			if (err) {
				console.log("Error trying to fetch VALs playlist: " + err);
			} else {
				console.log("Added to VALs list: " + reply)
			}
		});
	});
	
	socket.on('room:add', function(room) {
		redisClient.
	})
	
	socket.on('room:delete', function(room) { 
		console.log('\nreceived request to delete room: '+room);
	
		if(!room) return;
		redisClient.lrem('rooms', 0, room, function(err, rem) {
			if(err) return;
			
			if(rem > 0) {
				console.log('...room deleted from room list! # removed (should be 1): '+rem)
				// var message = postMan.packRoomDelete(room);
				// 
				// redisClient.publish('admin', message, function(err, numClients) {
				// 	console.log('...pubsub sent, numClients listening: '+numClients);
				// });
				redisClient.del('room:'+room, function(err, reply) {
					if(reply > 0) 
						console.log('...also cleared all room info from redis, reply: '+reply)
					else 
						console.log('...uh oh, tried deleting room info from redis, but didn\'t')
				});
			} else {
				console.log('...no room found!')
			}
			roomMgr.refreshRooms();
		})
	});
	
	socket.on('room:rename', function(data) {
		console.log('\nreceived request to rename room: '+ data.oldName + ' to: ' + data.newName)
		var oldName = data.oldName;
		var newName = data.newName;
		
		if(roomMgr.hasRoom(newName)) {
			console.log('...room with '+newName+' already exists! [return]')
			return;
		}
		
		redisClient.lrem('rooms', 0, oldName, function(err, rem) {
			if(err) return;
			
			if(rem > 0) {
				console.log('...deleted old room, moving room info to new room')
				redisClient.rename('room:'+oldName, 'room:'+newName);
			}
		})
		// var message = postMan.packDeleteRoomMsg(oldName, newName);
		// redisClient.publish('admin', message, function(err, numClients) {
		// 	console.log('...pubsub sent, numClients listening: '+numClients);
		// });	
	});
	
	socket.on('room:addVideos', function(data) {
		if(!data) return;
		
		console.log('received request to add videos: '+data+' to room: '+'room:'+room+':val:playlist')
		data = JSON.parse(data);
		
		console.log('video length: '+data.videos.length)
		var room = data.room;
		
		multi = redisClient.multi();
		for(var i=0; i < data.videos.length; i++) {
			var video = data.videos[i];
			console.log('video: '+JSON.stringify(video))
			if(video.id && video.title && video.duration && video.thumb && video.author) {
				multi.rpush('room:'+room+':val:playlist', JSON.stringify(video));
			}
		}
		
		multi.exec(function(err, reply) {
			if(err) { console.log('error in adding to val\'s playlist: '+err) }
			else { console.log('finished, here is the reply: '+reply) }
		});
	})

});



app.listen(4000);


