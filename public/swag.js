$(function() {
	
	socket = io.connect();
	
	$("#roomList").change(function(data){
		socket.emit("room:getVALPlaylist", {room: data.srcElement.value});
	})
	
	socket.on("val:playlistResults", function(response) {
		$("#VALsList").empty();
		for (var x in response) {
			$("#VALsList").append($("<option></option>").attr("value",response[x]).text(response[x]));
		}
		
	});
	
	$("#addVideo").click(function() {
		socket.emit("room:addToVALPlaylist", 
			{room: $("#roomList option:selected").val(), 
			 video: $("#vidInput").val()
			});
	});
	
	
	var RESULTS_PER_PAGE = 50;
	$('#addChannel').click(function() {
		var channel = $('#vidInput').val();

		//alt: http://gdata.youtube.com/feeds/api/videos?v=2&author=<author>
		//
		//you can add &orderby=
		//	options are relevance, published, viewCount, rating
		//													^reverse chronological order
		var ytUrl = 'http://gdata.youtube.com/feeds/api/users/' + channel 
			+ '/uploads?v=2&alt=jsonc&max-results='+RESULTS_PER_PAGE
		
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
		var room = $('#roomList').val();
		socket.emit('room:add', room);
	})
	
	$('#delRmBtn').click(function() {
		var room = $('#roomList').val();
		socket.emit('room:delete', room);
	});
	
	$('#renameRmBtn').click(function() {
		
	});
	
});
