//Get elements we need
var painting = document.getElementById('CanvasContainer');
var canvas = document.getElementById('CollaborativeCanvas');
var clearButton = document.getElementById('clearHistory');

//initalize socket.io
var socket = io();

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

var color = '#00CC99';
var isPainting;
var id = $('#CollaborativeCanvas').data("history-id");
var syncTimerID;


function addClick(x, y, dragging, brush_color)
{
  canvasHistory.push({"x":x,"y":y,"drag":dragging,"color":brush_color});
  unsentHistory.push({"x":x,"y":y,"drag":dragging,"color":brush_color});
}

function redraw(){
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  context.strokeStyle = color;
  context.lineJoin = "round";
  context.lineWidth = 5;

  drawHistory(canvasHistory);
  drawHistory(serverHistory);
}

function drawHistory(history){
  for(var i=0; i < history.length; i++) {
    context.beginPath();
    if(history[i].drag && i){
      context.moveTo(history[i-1].x, history[i-1].y);
     }else{
       context.moveTo(history[i].x-1, history[i].y);
     }
     context.lineTo(history[i].x, history[i].y);
     context.closePath();
     context.stroke();
  }
}

function getHistory(){
  return $.get('/collaborative_canvas/history/'+id, function( data ) {
    if(data.history){
      serverHistory = data.history;
    }
    redraw();
    console.log('History set to server history');
  });
}

function sendHistory(){
  var sentHistoryLength = unsentHistory.length;

  return $.ajax({
    method: "POST",
    url: "/collaborative_canvas/history",
    data: JSON.stringify({'id':id,'history':unsentHistory}),
    contentType: 'application/json',
  }).done(function( data ) {
    if(sentHistoryLength < unsentHistory.length) {
      console.log('Slicing '+sentHistoryLength+' from unsent history of '+unsentHistory.length);
      unsentHistory = unsentHistory.slice(sentHistoryLength);
    }
    else {
      console.log('No unsent history clearing unsent array');
      unsentHistory = [];
    }
    console.log('History written, receiving updated history');
    getHistory().done( function(){
      window.setTimeout(synchronizeHistory, 500);
    });
  });
}

function clearHistory(){
  canvasHistory = [];
  unsentHistory = [];
  serverHistory = [];

  window.clearTimeout(syncTimerID);

  return $.ajax({
    method: "POST",
    url: "/collaborative_canvas/clear_history",
    data: JSON.stringify({'id':id}),
    contentType: 'application/json',
  }).done(function( data ) {
    console.log('History written, receiving updated history');
    getHistory().done( function(){
      syncTimerID = window.setTimeout(synchronizeHistory, 500);
    });
  });
}

function synchronizeHistory(){
  if(unsentHistory.length > 0){
    sendHistory();
  }
  else {
    getHistory().done( function(){
      syncTimerID = window.setTimeout(synchronizeHistory, 500);
    });
  }
}

canvas.addEventListener('mousemove', function(e) {
  mouse.x = e.pageX - this.offsetLeft;
  mouse.y = e.pageY - this.offsetTop;

  if(isPainting){
    addClick(mouse.x, mouse.y, true, color);
    redraw();
  }
}, false);

canvas.addEventListener('mousedown', function(e) {
  isPainting = true;
  addClick(mouse.x, mouse.y);
  redraw();
}, false);

canvas.addEventListener('mouseup', function() {
  isPainting = false;
}, false);

canvas.addEventListener('mouseleave', function() {
  isPainting = false;
}, false);

clearButton.addEventListener('click', clearHistory , false);

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

  syncTimerID = window.setTimeout(emitUnsentHistory, 500);
}

socket.on('draw history', function(history){
  console.log("Got " + history.length + ' of history objects.');
  serverHistory.push.apply(serverHistory, history);
  redraw();
});

// getHistory()
syncTimerID = window.setTimeout(emitUnsentHistory, 500);
