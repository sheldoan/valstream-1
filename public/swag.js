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
			}
			);
	});
	
	$("#addVideo").click(function() {
		socket.emit("room:addToVALPlaylist", 
			{room: $("#roomList option:selected").val(), 
			 video: $("#vidInput").val()
			}
			);
	});
	
});
