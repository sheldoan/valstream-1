$(function() {
	
	var currValPlaylist = { };
	socket = io.connect();
	
	$("#roomList").change(function(data){
		socket.emit("room:getListsForRoom", {room: data.srcElement.value});
	});
	
	
	socket.on("val:playlistResults", function(videos) {
		$("#VALsList").empty();
		currValPlaylist = {};
		for (var index in videos) {
			var currVideo = videos[index];
			currVideo = JSON.parse(currVideo);
			$("#VALsList").append($("<option></option>").attr("value",JSON.stringify(currVideo)).text(currVideo.title));
			
			var currId = currVideo.id;
			currValPlaylist[currId] = true;
		}
	});
	
	socket.on('room:history', function(videos) {
		$('#roomHistory').empty();
		for(var index in videos) {
			var currVideo = videos[index];
			currVideo = JSON.parse(currVideo);
			$("#roomHistory").append($('<option></option>').attr('value',JSON.stringify(currVideo)).text(currVideo.title))
		}
	});
	
	socket.on("promo:made", function(data){
		//add data.promo to promo list
		$("#promoList").append($("<option></option>").attr("value", data.promo).text(data.promo));
	});
	
	socket.on("promo:deleted", function(data){
		//remove data.promo from promo list
		$('#promoList > option[value='+data.promo+']').remove();
	});
	
	$("#addPromo").click(function(){
		//send promo:make event
		var promoName = jQuery.trim($("#promoInput").val());
		if (promoName.length > 0) {
			socket.emit("promo:make", {promo: promoName});
		}
	});
	
	$("#deletePromo").click(function(){
		//send promo:delete event
		var promoName = $('#promoList :selected').val();
		if (promoName) {
			socket.emit("promo:delete", {promo: promoName});
		} else {
			console.log('problem sending delete event for promo deletion')
		}		
	});
	
	$("#addVideo").click(function() {
		var videoId = $('#vidInput').val()
		if(currValPlaylist[videoId]) {
			console.log("video is already in the list!")
		} else {
				socket.emit("room:addToVALPlaylist", 
					{room: $("#roomList option:selected").val(), 
					 video: $("#vidInput").val()
				});
		}
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
					var id = videoResults[i]['video']['id'],
						title = videoResults[i]['video']['title'],
						duration = videoResults[i]['video']['duration'],
						author = videoResults[i]['video']['uploader'];
					//	thumb = videoResults[i]['video']['thumbnail']['sqDefault'];
					var thumb = 'http://i.ytimg.com/vi/default.jpg';
					if(videoResults[i]['video']['thumbnail']) {
						console.log('video thumb: '+videoResults[i]['video']['thumbnail']['sqDefault'])
						thumb = videoResults[i]['video']['thumbnail']['sqDefault'];
					} else {
						console.log('video thumb is undefined!!!')
					}
					
					if(currValPlaylist[id]) {
						console.log('the playlist already has this video! not adding')
					} else {
						console.log('curr val playlist does not have this video')
					}
					if(!currValPlaylist[id] && id && title && duration && author && thumb) {
						console.log('adding video: '+id+' '+title+' '+duration+' '+author+' '+thumb)
						currValPlaylist[id] == true;
						videosToAdd.push({
							id: id,
							title: title,
							duration: duration,
							author: author,
							thumb: thumb
						});
					}	
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
		var roomName = $('#roomInput').val();
		roomName = $.trim(roomName);
		var roomId = roomName.replace(/\s+/g, '-');
		console.log('>> adding roomId, roomName to add: '+roomId+','+roomName)
		socket.emit('room:add', { roomId: roomId, roomName: roomName });
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

		console.log('deleting from history '+videoToDel)
		var message = {
			room: room,
			video: videoToDel
		};
		socket.emit('val:deleteVideo', JSON.stringify(message));
	});
	
			// var videoResults = data['items'];	//array
			// var videosToAdd = [];
			// for(var i=0; i < videoResults.length; i++) {
			// 	videosToAdd.push({
			// 		id: videoResults[i]['id'],
			// 		title: videoResults[i]['title'],
			// 		duration: videoResults[i]['duration'],
			// 		author: channel,
			// 		thumb: videoResults[i]['thumbnail']['sqDefault'],
			// 		viewCount: videoResults[i]['viewCount']
			// 	});
			// }
	$("#addReddit").click(function() {
		var subReddit = $('#subInput').val();
		var url = "http://www.reddit.com/r/"+subReddit+"/search.json?limit=100&q=site%3Ayoutube.com&restrict_sr=on"
		
		$.ajax({
			url: url,
	    dataType: "jsonp",
	    jsonp: "jsonp",
	    success: function(data) {
        var videos = []
				console.log('data: '+data)
        for(var x in data.data.children){
					var currResult = data.data.children[x].data;
					//console.log(currResult);
					if(currResult.domain == "youtube.com" && currResult.media && currResult.media.oembed && currResult.media.oembed.url) {
						var videoUrl = currResult.media.oembed.url;
						var videoId = videoUrl.substr(videoUrl.indexOf("v=") + 2);
						console.log('extracted video id: '+videoId)
						fetchAndAddVideo(videoId);
					}
        }  
	    },
	    
			error: function(jXHR, textStatus, errorThrown) {
				if(textStatus !== 'abort'){
					alert('Could not load feed. Is reddit down?');
				}
	    }
		});	//end request
		
	});
	
	function fetchAndAddVideo(videoId) {
		var ytUrl = 'http://gdata.youtube.com/feeds/api/videos/'+videoId+'?&alt=jsonc&v=2';
		if(currValPlaylist[videoId]) {
			console.log('video already exists in playlist! not adding')
			return;
		}
		$.ajax({
			url: ytUrl,
			dataType: 'json',
			success: function(data, textStatus) { 
				//alert('data: '+JSON.stringify(data))
				var videoData = data['data'];

				if(!videoData || !videoData['accessControl'] || videoData['accessControl']['embed'] == 'denied') {
					console.log("This video cannot be embedded!")
					return;
				}
				var currVideo = {
					id: videoData['id'],
					title: videoData['title'],
					thumb: videoData['thumbnail']['sqDefault'],
					author: videoData['uploader'],
					duration: videoData['duration'],
				}
				currValPlaylist[videoId] = true;
				
				console.log('sending video to add to server: '+JSON.stringify(currVideo))
				var videos = [];
				videos.push(currVideo);
				var message = {}
				message.videos = videos;
				message.room = $('#roomList').val();
				socket.emit('room:addVideos', JSON.stringify(message))
			}
		});
	}
});
