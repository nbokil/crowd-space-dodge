// Define the routes for this controller
exports.init = function(app) {
  app.get('/', index); // essentially the app welcome page
  //app.get('/game', game);
}

// No path:  display instructions for use
index = function(req, res) {
  res.render('index');
}
