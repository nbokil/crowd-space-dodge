exports.init = function(io) {
	var currentPlayers = 0; //keep track of the number of players
	var gameplay; //initialize global variable that will be the interval
	var board; //intialize board variable
	var cols; //initialize cols variable

  // When a new connection is initiated
	io.sockets.on('connection', function (socket) {
		++currentPlayers;
		// Send ("emit") a 'players' event back to the socket that just connected.
		socket.emit('players', { number: currentPlayers});

		/*
		 * Emit players events also to all (i.e. broadcast) other connected sockets.
		 * Broadcast is not emitted back to the current (i.e. "this") connection
     */
		socket.broadcast.emit('players', { number: currentPlayers});

		//Emit that the game has started for all players when one person clicks start game button
		socket.on('startgame', function (data) {
			io.sockets.emit('readytostart');
			board = data.board;
			cols = data.cols;
			gameplay = setInterval(animate_board, 1000);
		})

		function animate_board() {
			io.sockets.emit('check_collision');
			move_board();
		}

		//Emit that game has ended to all players once one person loses or finishes the game
		socket.on('endgame', function () {
			clearInterval(gameplay);
			io.sockets.emit('finished');
		})

		//change board here so that it is the same for all players
		function move_board() {
			
			//to show as if pieces are falling, remove the bottom row every second
			//and add a new row on top. Rather than moving pieces down, this is 
			//simply changing the array and appears as if pieces are falling
			board.pop();
			//generate a random first row that will move through the board
			var first_row = [];
			for (var j=0; j<cols; j++) {
				var num = Math.round(Math.random());
				first_row.push(num);
			}
			//ensure that there is a path for player to follow through board
			var counter = 0;
			while (counter < cols) {
				if ((board[0][counter]) == 0) {  //if block is empty, create at least one empty block next to it or in front
					//chance determines whether block to left, straight, or right is empty
					var chance = Math.floor(Math.random() * 3) + 1;
					if (chance == 1) { //block to left should be empty
						if (counter == 0) {
							first_row[cols-1] = 0;
						}
						else {
							first_row[counter-1] = 0;
						}
					}
					else if (chance == 2) { //block to right should be empty
						if (counter == cols-1) {
							first_row[0] = 0;
						}
						else {
							first_row[counter+1] = 0;
						}
					}
					else { //block in front should be empty
						first_row[counter] = 0;
					}
				}
				counter += 1;
			}
			board.unshift(first_row); //add it to the front of the array
			io.sockets.emit('change_board', {board: board} );
		}

		
		/*
		 * Upon this connection disconnecting (sending a disconnect event)
		 * decrement the number of players and emit an event to all other
		 * sockets.  Notice it would be nonsensical to emit the event back to the
		 * disconnected socket.
		 */
		socket.on('disconnect', function () {
			--currentPlayers;
			socket.broadcast.emit('players', { number: currentPlayers});
		});
	});
}
