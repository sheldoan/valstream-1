var express = require('express'),
	app = express.createServer(),
	io = require('socket.io').listen(app),
	redis = require('redis'),
	redisClient = redis.createClient(),
	_ = require('underscore')._,
	Backbone = require('backbone'),
	http = require('http');
	
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
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));

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
	
	socket.on("room:getListsForRoom", function(data) {
		var rID = data.room;
		if (redisClient) {
			redisClient.lrange("room:" + rID + ":val:playlist",0,-1, function(err, reply) {
				if (err) {
					console.log("Error trying to fetch VALs playlist: " + err);
				} else {
					//console.log("Got VALs List: " + reply)
					socket.emit("val:playlistResults", reply);
				}
			});
			
			redisClient.lrange('room:'+rID+':history', 0, -1, function(err, reply) {
				if(err) return;
				
				socket.emit('room:history', reply);
			})
		}
	});
	
	//https://gdata.youtube.com/feeds/api/videos/t1IiUAtoNBk?v=2&alt=jsonc
	socket.on("room:addToVALPlaylist", function(data) {		
		var rID = data.room, vID = data.video;
		console.log("pushing to: " + "room:" + rID + ":val:playlist")
		
		var options = { 
			host: 'gdata.youtube.com',
			port: 80,
			path: '/feeds/api/videos/'+vID+'?v=2&alt=jsonc'
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
				
				redisClient.lpush("room:" + rID + ":val:playlist", JSON.stringify(currVideo),function(err, reply) {
					if (err) {
						console.log("Error trying to fetch VALs playlist: " + err);
					} else {
						console.log("Added to VALs list: " + reply)
					}
				});
			});
		});

		req.on('error', function(e) {
		  console.log('['+roomName+'][VAL] playVideo(): *** ERROR *** ' + e.message);
		});
		req.end();
		
		
	});
	
	socket.on('room:add', function(room) {
		if(!room || room == '') return;
		if(roomMgr.hasRoom(room)) {
			console.log('[socket] [room:add] ERROR! room already exists')
			return;
		}
		
		redisClient.rpush('rooms', room, function(err, reply) {
			if(err) return;
			
			roomMgr.addRoom(room);
			var message = postMan.packRoomAdd(room);
			redisClient.publish('admin', message, function(err, numClients) {
				console.log('...pubsub sent, numClients listening: '+numClients);
			});
		})
	})
	
	socket.on('room:delete', function(room) { 
		console.log('\nreceived request to delete room: '+room);
	
		//if(!room) return;
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
				
				redisClient.del('room:'+room+':val:playlist', function(err, reply) {
					if(reply > 0)
						console.log('...also cleared val\'s playlist from redis, reply: '+reply)
					else
						console.log('...tried deleting val\'s playlist from redis, reply: '+reply)
				});
			} else {
				console.log('...no room found!')
			}
			roomMgr.refreshRooms();
		})
	});
	
	socket.on('room:rename', function(data) {
		data = JSON.parse(data);
		console.log('\nreceived request to rename room: '+ data.oldName + ' to: ' + data.newName)
		
		var oldName = data.oldName;
		var newName = data.newName;
		
		if(!oldName || !newName) return;
		
		if(roomMgr.hasRoom(newName)) {
			console.log('...room with '+newName+' already exists! [return]')
			return;
		}
		
		redisClient.lrem('rooms', 0, oldName, function(err, rem) {
			if(err) return;
			
			if(rem > 0) {
				console.log('...deleted old room from rooms list, moving room info to new room')
				redisClient.rpush('rooms', newName);
				redisClient.rename('room:'+oldName, 'room:'+newName, function(err, reply) {
					if(err) {
						console.log("error in renaming room: "+err);
						return;
					}
				});
				redisClient.rename('room:'+oldName+':val:playlist', 'room:'+newName+':val:playlist', function(err, reply) {
					if(err) {
						console.log("error in renaming val playlist: "+err);
						return;
					}
				})
				redisClient.rename('room:'+oldName+':history', 'room:'+newName+':history', function(err, reply) {
					if(err) {
						console.log("error in renaming room history: "+err);
						return;
					}
				});
				
				var message = postMan.packRoomRename(oldName, newName);
				redisClient.publish('admin', message, function(err, numClients) {
					console.log('...pubsub sent, numClients listening: '+numClients);
				});
				roomMgr.refreshRooms();
			}
		})
	});
	
	socket.on('room:addVideos', function(data) {
		if(!data) return;

		data = JSON.parse(data);
		var room = data.room;
		if(!room || room == '') return;
		console.log('received request to add videos: '+data+' to room: '+'room:'+room+':val:playlist')
		
		multi = redisClient.multi();
		for(var i=0; i < data.videos.length; i++) {
			var video = data.videos[i];
			if(video.id && video.title && video.duration && video.thumb && video.author) {
				multi.rpush('room:'+room+':val:playlist', JSON.stringify(video));
			}
		}
		
		multi.exec(function(err, reply) {
			if(err) { console.log('error in adding to val\'s playlist: '+err) }
			else { console.log('finished, here is the reply: '+reply) }
		});
	})


	socket.on('history:deleteVideo', function(data) {
		console.log('received request to delete video from history')
		if(!data) return;
		data = JSON.parse(data);
		
		redisClient.lrem('room:'+data.room+':history', 0, data.video, function(err, rem) {
			if(rem > 0) console.log('...success! deleted video from history: '+rem)
		})
	});
	
	socket.on('val:deleteVideo', function(data) {
		if(!data) return;
		data = JSON.parse(data);
		
		console.log('trying to delete : '+data.video)
		redisClient.lrem('room:'+data.room+':val:playlist', 0, data.video, function(err, rem) {
			if(rem > 0) console.log('...success! deleted video from val\'s playlist:' +rem)
		})
	})
});



app.listen(4000);


