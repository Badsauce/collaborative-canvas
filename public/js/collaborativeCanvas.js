var userProfile = require('./userProfile');

//Get elements we need
var painting = document.getElementById('CanvasContainer');
var canvas = document.getElementById('CollaborativeCanvas');
var clearButton = document.getElementById('clearHistory');

//initalize socket.io
var socket = io();

//initalize shortid
var shortid = require('shortid').generate();
var currentContextId = shortid;

//initalize the canvas
var context = canvas.getContext('2d');

//Set the canvas to the size of it's container
var paint_style = getComputedStyle(painting);
canvas.width = parseInt(paint_style.getPropertyValue('width'));
canvas.height = parseInt(paint_style.getPropertyValue('height'));

//Object for capturing mouse movements within the canvas
var mouse = {x: 0, y: 0};

var canvasHistory = [];
var unsentHistory = [];
var serverHistory = [];

var userProfiles = {};

var color = randomColor();
var isPainting;
var syncTimerID;


function addClick(x, y, dragging, brush_color)
{
  canvasHistory.push({"x":x,"y":y,"drag":dragging,"color":brush_color,"id":shortid});
  unsentHistory.push({"x":x,"y":y,"drag":dragging,"color":brush_color,"id":shortid});
}

function refresh(){
  redraw();
  emitUnsentHistory();
}

function redraw(){
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  context.lineJoin = "round";
  context.lineWidth = 5;

  drawHistory(canvasHistory);
  drawHistory(serverHistory);
}

function drawHistory(history){
  userProfiles = {};

  for(var i=0; i < history.length; i++) {
    currentContextId = history[i].id;

    //catch edgecases where a user joins mid stroke
    if(userProfiles[currentContextId] == undefined){
      //store the previous stroke for this context
      userProfiles[currentContextId] = {'x':history[i].x,'y':history[i].y};
    }

    context.strokeStyle = history[i].color;

    context.beginPath();

    if(history[i].drag && i){
      context.moveTo(userProfiles[currentContextId].x, userProfiles[currentContextId].y);
     }else{
       context.moveTo(history[i].x-1, history[i].y);
     }
    context.lineTo(history[i].x, history[i].y);
    context.closePath();
    context.stroke();

    //store the previous stroke for this context
    userProfiles[currentContextId] = {'x':history[i].x,'y':history[i].y};
  }
}

function clearHistoryButton(){
  clearHistory();
  socket.emit('clear history', 0);
}

function clearHistory(){
  canvasHistory = [];
  unsentHistory = [];
  serverHistory = [];

  refresh();
}

canvas.addEventListener('mousemove', function(e) {
  mouse.x = e.pageX - this.offsetLeft;
  mouse.y = e.pageY - this.offsetTop;

  if(isPainting){
    addClick(mouse.x, mouse.y, true, color);
    refresh();
  }
}, false);

canvas.addEventListener('mousedown', function(e) {
  isPainting = true;
  addClick(mouse.x, mouse.y);
  refresh();
}, false);

canvas.addEventListener('mouseup', function() {
  isPainting = false;
}, false);

canvas.addEventListener('mouseleave', function() {
  isPainting = false;
}, false);

clearButton.addEventListener('click', clearHistoryButton , false);

function emitUnsentHistory(){
  if(unsentHistory.length > 0){
    var sentHistoryLength = unsentHistory.length;

    console.log('Sending ' + sentHistoryLength + ' of unsent history objects.');
    socket.emit('draw history', unsentHistory);

    if(sentHistoryLength < unsentHistory.length) {
      console.log('Slicing '+sentHistoryLength+' from unsent history of '+unsentHistory.length);
      unsentHistory = unsentHistory.slice(sentHistoryLength);
    }
    else {
      console.log('No unsent history clearing unsent array');
      unsentHistory = [];
    }
  }
}

socket.on('draw history', function(history){
  console.log("Got " + history.length + ' of history objects.');
  serverHistory.push.apply(serverHistory, history);
  refresh();
});

socket.on('clear history', clearHistory);
