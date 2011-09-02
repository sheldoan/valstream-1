$(function() {
	
	socket = io.connect();
	
	$("#roomList").change(function(data){
		socket.emit("room:getListsForRoom", {room: data.srcElement.value});
	});
	
	socket.on("val:playlistResults", function(videos) {
		$("#VALsList").empty();
		for (var index in videos) {
			var currVideo = videos[index];
			currVideo = JSON.parse(currVideo);
			console.log('adding '+currVideo.title)
			$("#VALsList").append($("<option></option>").attr("value",JSON.stringify(currVideo)).text(currVideo.title));
		}
	});
	
	socket.on('room:history', function(videos) {
		$('#roomHistory').empty();
		for(var index in videos) {
			var currVideo = videos[index];
			currVideo = JSON.parse(currVideo);
			$("#roomHistory").append($('<option></option>').attr('value',JSON.stringify(currVideo)).text(currVideo.title))
		}
	})
	
	$("#addVideo").click(function() {
		socket.emit("room:addToVALPlaylist", 
			{room: $("#roomList option:selected").val(), 
			 video: $("#vidInput").val()
			});
	});
	
	$('#addVideosFromPlaylist').click(function() {
		var playlist = $('#vidInput').val();
		
		var ytUrl = 'https://gdata.youtube.com/feeds/api/playlists/'+playlist+'?v=2&alt=jsonc&max-results=50'
		
		$.ajax({
			url: ytUrl,
			dataType: 'json',
			success: function(data, textStatus) { 
				//alert('data: '+JSON.stringify(data))
				var data = data['data'];
				var totalUploads = data['totalItems'],
					startIndex = data['startIndex'];
					
				var videoResults = data['items'];	//array
				var videosToAdd = [];
				for(var i=0; i < videoResults.length; i++) {
					videosToAdd.push({
						id: videoResults[i]['video']['id'],
						title: videoResults[i]['video']['title'],
						duration: videoResults[i]['video']['duration'],
						author: videoResults[i]['video']['uploader'],
						thumb: videoResults[i]['video']['thumbnail']['sqDefault'],
					});
				}
				var message = {};
				message.videos = videosToAdd;
				message.room = $('#roomList').val();
				console.log('sending message: '+JSON.stringify(message))
				socket.emit('room:addVideos', JSON.stringify(message));
			}
		});
	})
	
	var RESULTS_PER_PAGE = 50;
	$('#addChannel').click(function() {
		var channel = $('#vidInput').val();

		//alt: http://gdata.youtube.com/feeds/api/videos?v=2&author=<author>
		//
		//you can add &orderby=
		//	options are relevance, published, viewCount, rating
		//													^reverse chronological order
		var ytUrl = 'http://gdata.youtube.com/feeds/api/users/' + channel 
			+ '/uploads?v=2&alt=jsonc&format=5&max-results='+RESULTS_PER_PAGE
		
		$.ajax({
			url: ytUrl,
			dataType: 'json',
			success: function(data, textStatus) { 
				//alert('data: '+JSON.stringify(data))
				var data = data['data'];
				var totalUploads = data['totalItems'],
					startIndex = data['startIndex'];
					
				var videoResults = data['items'];	//array
				var videosToAdd = [];
				for(var i=0; i < videoResults.length; i++) {
					videosToAdd.push({
						id: videoResults[i]['id'],
						title: videoResults[i]['title'],
						duration: videoResults[i]['duration'],
						author: channel,
						thumb: videoResults[i]['thumbnail']['sqDefault'],
						viewCount: videoResults[i]['viewCount']
					});
				}
				var message = {};
				message.videos = videosToAdd;
				message.room = $('#roomList').val();
				console.log('sending message: '+JSON.stringify(message))
				socket.emit('room:addVideos', JSON.stringify(message));
			}
		});
	})
	
	$('#addRmBtn').click(function() {
		var room = $('#roomInput').val();
		socket.emit('room:add', room);
	})
	
	$('#delRmBtn').click(function() {
		var room = $('#roomList').val();
		socket.emit('room:delete', room);
	});
	
	$('#renameRmBtn').click(function() {
		var message = {};
		message.oldName = $('#roomList').val();
		message.newName = $('#roomInput').val();
		
		console.log('renaming '+message.oldName + ' to '+message.newName);
		socket.emit('room:rename', JSON.stringify(message));
	});
	
	
	$('#delFromHistBtn').click(function() {
		var room = $('#roomList').val();
		console.log('room: '+room)
		if(!room) return;
		var videoToDel = $('#roomHistory :selected').attr('value');

		console.log('deleting from history '+videoToDel)
		var message = {
			room: room,
			video: videoToDel
		};
		socket.emit('history:deleteVideo', JSON.stringify(message));
	});
	
	$('#delFromValBtn').click(function() {
		var room = $('#roomList').val();
		if(!room) return;
		var videoToDel = $('#VALsList :selected').attr('value');

		var message = {
			room: room,
			video: videoToDel
		};
		socket.emit('val:deleteVideo', JSON.stringify(message));
		
	});
});
