var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var serverPort = 1337;

app.use('/static', express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/canvas.html');
});

app.get('/debug', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('draw history', function(history){
    console.log(history);
    io.emit('draw history', history);
  });
  socket.on('clear history', function(){
    console.log("Clear History");
    io.emit('clear history', 0);
  });
});



http.listen(serverPort, function(){
  console.log('listening on localhost:' + serverPort);
});
