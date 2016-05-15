var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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
    io.emit('draw history', JSON.stringify(history));
  });
});


http.listen(3000, function(){
  console.log('listening on localhost:3000');
});
