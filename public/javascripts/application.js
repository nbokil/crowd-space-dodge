$(document).ready(function() {

//-------------------Setting up initial socket connection --------------------------------------------------

	//var socket = io.connect("http://spacedodge-nbokil.rhcloud.com:8000");
	var socket = io.connect();
	//show the number of current players in the game
	socket.on('players', function (data) {
	  $("#numPlayers").text(data.number);
		});

//-------------------Setting up game logic and board --------------------------------------------------

	//Create empty gameboard array depending on number of rows and columns
	var rows = 7;
	var cols = 6;
	var board = [];
	var bonus = 0.00;
	for (var i=0; i<rows; i++) {
		board.push([]);
		for (var j=0; j<cols; j++) {
			board[i].push(0);
		}
	}

	//Initialize gameboard div with width and height displayed as style
	var cell_size = 50; //in pixels
	var width = cell_size*cols;
	var height = cell_size*rows;
	var gameboard = $("<div id='gameboard' style='width: "+width+"px; height: "+height+"px;'></div>");
	
	//Create piece divs on the gameboard that can be changed with css to appear as animation
	for (var i=0; i<rows; i++) {
		for (var j=0; j<cols; j++) {
			var piece = $("<div id='piece_"+i+"_"+j+"'></div>");
			
			//set width and height of piece div, as well as position to absolute
			$(piece).css("width", cell_size);
			$(piece).css("height", cell_size);
			$(piece).css("position", "absolute");

			//check if cell should be colored or not
			if (board[i][j] == 0) {
				$(piece).css("background-color", "black");
			}
			else {
				$(piece).css("background-color", "orange");
			}

			//set position of cell in gameboard
			$(piece).css("left", j*cell_size);
			$(piece).css("top", i*cell_size);

			$(gameboard).append(piece);
		}
	}

	//Create a player div that can move along the bottom row of the gameboard
	var player = $("<div id='player'></div>");
	$(player).css("width", cell_size);
	$(player).css("height", cell_size);

	var player_col = 0; //column that player starts off in
	//Set location of player on the board
	var player_top = ((rows-1)*cell_size);
	$(player).css("left", player_col*cell_size);
	$(player).css("top", player_top);

	//Create a crowd player div that can move along the bottom row of the gameboard
	var crowd = $("<div id='crowd'></div>");
	$(crowd).css("width", cell_size);
	$(crowd).css("height", cell_size);

	var crowd_col = 0; //column that crowd starts off in
	//Set location of crowd on the board
	var crowd_top = ((rows-1)*cell_size);
	$(crowd).css("left", crowd_col*cell_size);
	$(crowd).css("top", crowd_top);

	$(gameboard).append(player);
	$(gameboard).append(crowd);

	$(document.body).append(gameboard); //INITIAL GAMEBOARD COMPLETE

//---------------Animation and Gameplay-------------------------------------------------
	
	var keystrokes = 0; //create counter for keystrokes that will detect cheaters

	//Move the piece on bottom row when left and right arrow keys are clicked
	$(document).keydown(function(e) {
	  if(e.keyCode==37) {
	  	keystrokes += 1;
	    // left arrow clicked
	    if (player_col == 0) {
	    	player_col = cols-1;
	    }
	    else {
	    	player_col -= 1;
	    }
	    $(player).css("left", player_col*cell_size);
	  }
	  else if(e.keyCode == 39) {
	  	keystrokes += 1;
	    // right arrow clicked
	    if (player_col == (cols-1)) {
	    	player_col = 0;
	    }
	    else {
	    	player_col += 1;
	    }
	    $(player).css("left", player_col*cell_size);
	  }
	});

	//send player_col of each client so that we can redraw crowd player on board
	socket.on('get_player_locations', function () {
		socket.emit('send_player_locations', {player_col: player_col} );
	})

	//redraw crowd player based on average of player locations
	socket.on('move_crowd_player', function (data) {
		crowd_col = data.col;
		$(crowd).css("left", crowd_col*cell_size);
	})

	$('#majority').on('click', function() {
		socket.emit('majority_mediator');
	})

	$('#median').on('click', function() {
		socket.emit('median_mediator');
	})

	//called from serverSocket to animate board in the same way across all clients
	socket.on('change_board', function (data) {
	  	board = data.board;
	  	repaint_board();
	  	increment_bonus();
	})

	function repaint_board() {
		for (var i=0; i<rows; i++) {
			for (var j=0; j<cols; j++) {
				var piece_id = "piece_"+i+"_"+j;
				var piece = document.getElementById(piece_id);
				if (board[i][j] == 0) {
					$(piece).css("background-color", "black");
				}
				else {
					$(piece).css("background-color", "orange");
				}
			}
		}			
	}

	socket.on('check_collision', function() {
		//check if player collided with a piece by comparing player_col
		//to last row of board
		if (board[rows-1][player_col] == 1) {
			socket.emit('endgame');
		}
	})

	function increment_bonus() {
		//increment the bonus every second that the player doesn't collide
		//if bonus has reached $2.00 (max), end the game
		if (bonus == 2) {
			socket.emit('endgame');
		}
		else {
			bonus += 0.01;
			bonus_text = bonus.toFixed(2);
			var bonus_field = document.getElementById("bonus");
			$(bonus_field).text("$"+bonus_text);
		}
	}

	function end_game() {
		var bonus_input = $("<input type='hidden' name='bonus' value='" + bonus.toFixed(2) + "'>").appendTo($(form_selector));
		var keystrokes_input = $("<input type='hidden' name='keystrokes' value='" + keystrokes + "'>").appendTo($(form_selector));
		$('#mturk_form').submit(); //submit the results to mturk
		alert("Thanks for playing! One of the members in your team has lost the game. Your results have been submitted to us and you will receive payment shortly. Have a great day!");
	}

	$('#start').on('click', function() {
		socket.emit('startgame', {board: board, cols: cols});
	})

	//start game once everyone is ready
	socket.on('readytostart', function () {
	  	$('#start').hide();
	})

	//end the game once one person loses
	socket.on('finished', function () {
	  	end_game();
	 	$('#start').show();
	})
	
//--------------------mturk.js code below --------------------------------------------------------------
	/**
	 *  
	 *  gup(name) :: retrieves URL parameters if provided
	 *
	 *  Prepares the page for MTurk on load.
	 *  1. looks for a form element with id="mturk_form", and sets its METHOD / ACTION
	 *    1a. All that the task page needs to do is submit the form element when ready
	 *  2. disables form elements if HIT hasn't been accepted
	 *
	 **/

	// selector used by jquery to identify your form
	var form_selector = "#mturk_form";

	// function for getting URL parameters
	function gup(name) {
	  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	  var regexS = "[\\?&]"+name+"=([^&#]*)";
	  var regex = new RegExp(regexS);
	  var results = regex.exec(window.location.href);
	  if(results == null) {
	    return "";}
	  else {return unescape(results[1]);}
	}

	// Turkify the captioning page.
  // if assigntmentId is a URL parameter
  if((aid = gup("assignmentId"))!="" && $(form_selector).length>0) {

    // If the HIT hasn't been accepted yet, disabled the form fields.
    if(aid == "ASSIGNMENT_ID_NOT_AVAILABLE") {
	    $('input,textarea,select').attr("DISABLED", "disabled");
    }
    	
    // Add a new hidden input element with name="assignmentId" 
    // with assignmentId as its value.
    var aid_input = $("<input type='hidden' name='assignmentId' value='" + aid + "'>").appendTo($(form_selector));

    // Make sure the submit form's method is POST
    $(form_selector).attr('method', 'POST');

    // Set the Action of the form to the provided "turkSubmitTo" field
    if((submit_url=gup("turkSubmitTo"))!="") {
      $(form_selector).attr('action', submit_url + '/mturk/externalSubmit');
    }
  }

});