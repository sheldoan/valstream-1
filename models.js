(function() { 
	var _ = require('underscore')._,
  Backbone = require('backbone'),
	models = exports,
	redis = require('redis'),
	redisClient = redis.createClient();
	
	models.Room = Backbone.Model.extend({

	});

	models.PubSubPostMan = Backbone.Model.extend({
		packRoomRename: function(oldName, newName) {
			var message = {
				oldName: oldName,
				newName: newName,
				type: 'room:rename'
			}

			return JSON.stringify(message);
		},

		packRoomDelete: function(room) {
			var message = { room: room, type: 'room:delete' };
			return JSON.stringify(message);
		},
		
		packRoomAdd: function(room) {
			var message = { room: room, type: 'room:add' };
			return JSON.stringify(message);
		}
	});

	models.RoomManager = Backbone.Model.extend({
		initialize: function() {
			this.roomMap = {};
			this.refreshRooms();
		},

		refreshRooms: function() { 
			this.roomMap = {};
			var mgr = this;
			console.log('[RoomManager] refreshRooms(): refreshing...')
			redisClient.lrange('rooms',0,-1, function(err, rooms) {
				if(rooms) {
					_.each(rooms, function(roomId) {
						mgr.roomMap[roomId] = new models.Room({ roomId: roomId });
					});
				}
			});
		},
		
		addRoom: function(room) {
			if(!this.hasRoom(room))
				this.roomMap[room] = new models.Room({ room: room });
		},

		hasRoom: function(room) {
			if(this.roomMap[room]) return true;
			return false;
		},
		
		removeRoom: function(room) {
			if(this.roomMap[room]) {
				delete this.roomMap[room];
				console.log('[RoomManager] removeRoom(): successfully removed room: '+room)
				return true;
			}
			return false;
		}
	});
	
	models.Video = Backbone.Model.extend({});
}) ()