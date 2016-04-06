$(document).ready(function() {

//-------------------Setting up initial socket connection --------------------------------------------------

	//var socket = io.connect("http://spacedodge-nbokil.rhcloud.com:8000");
	var socket = io.connect();
	//show the number of current players in the game
	socket.on('players', function (data) {
	  console.log(data);
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

	$(gameboard).append(player);

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

	function animate_board() {
		//first, check if player has collided with block
		//if so, end the game
		collided = check_collision();

		if (collided == false) {
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
			repaint_board();
			increment_bonus();
		}
		else {
			socket.emit('endgame');
		}
	}

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

	function check_collision() {
		//check if player collided with a piece by comparing player_col
		//to last row of board
		if (board[rows-1][player_col] == 1) {
			return true;
		}
		else {
			return false;
		}
	}

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

	var gameplay; //initialize global variable that will be the interval

	function end_game() {
		clearInterval(gameplay);
		var bonus_input = $("<input type='hidden' name='bonus' value='" + bonus.toFixed(2) + "'>").appendTo($(form_selector));
		var keystrokes_input = $("<input type='hidden' name='keystrokes' value='" + keystrokes + "'>").appendTo($(form_selector));
		$('#mturk_form').submit(); //submit the results to mturk
		alert("Thanks for playing! One of the members in your team has lost the game. Your results have been submitted to us and you will receive payment shortly. Have a great day!");
	}

	function start_game() {
		gameplay = setInterval(animate_board, 1000);
	}

	$('#start').on('click', function() {
		socket.emit('startgame');
	})

	//start game once everyone is ready
	socket.on('readytostart', function () {
	  	start_game();
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