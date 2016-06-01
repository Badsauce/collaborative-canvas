(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
module.exports = require('./lib/index');

},{"./lib/index":5}],2:[function(require,module,exports){
'use strict';

var randomFromSeed = require('./random/random-from-seed');

var ORIGINAL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
var alphabet;
var previousSeed;

var shuffled;

function reset() {
    shuffled = false;
}

function setCharacters(_alphabet_) {
    if (!_alphabet_) {
        if (alphabet !== ORIGINAL) {
            alphabet = ORIGINAL;
            reset();
        }
        return;
    }

    if (_alphabet_ === alphabet) {
        return;
    }

    if (_alphabet_.length !== ORIGINAL.length) {
        throw new Error('Custom alphabet for shortid must be ' + ORIGINAL.length + ' unique characters. You submitted ' + _alphabet_.length + ' characters: ' + _alphabet_);
    }

    var unique = _alphabet_.split('').filter(function(item, ind, arr){
       return ind !== arr.lastIndexOf(item);
    });

    if (unique.length) {
        throw new Error('Custom alphabet for shortid must be ' + ORIGINAL.length + ' unique characters. These characters were not unique: ' + unique.join(', '));
    }

    alphabet = _alphabet_;
    reset();
}

function characters(_alphabet_) {
    setCharacters(_alphabet_);
    return alphabet;
}

function setSeed(seed) {
    randomFromSeed.seed(seed);
    if (previousSeed !== seed) {
        reset();
        previousSeed = seed;
    }
}

function shuffle() {
    if (!alphabet) {
        setCharacters(ORIGINAL);
    }

    var sourceArray = alphabet.split('');
    var targetArray = [];
    var r = randomFromSeed.nextValue();
    var characterIndex;

    while (sourceArray.length > 0) {
        r = randomFromSeed.nextValue();
        characterIndex = Math.floor(r * sourceArray.length);
        targetArray.push(sourceArray.splice(characterIndex, 1)[0]);
    }
    return targetArray.join('');
}

function getShuffled() {
    if (shuffled) {
        return shuffled;
    }
    shuffled = shuffle();
    return shuffled;
}

/**
 * lookup shuffled letter
 * @param index
 * @returns {string}
 */
function lookup(index) {
    var alphabetShuffled = getShuffled();
    return alphabetShuffled[index];
}

module.exports = {
    characters: characters,
    seed: setSeed,
    lookup: lookup,
    shuffled: getShuffled
};

},{"./random/random-from-seed":8}],3:[function(require,module,exports){
'use strict';
var alphabet = require('./alphabet');

/**
 * Decode the id to get the version and worker
 * Mainly for debugging and testing.
 * @param id - the shortid-generated id.
 */
function decode(id) {
    var characters = alphabet.shuffled();
    return {
        version: characters.indexOf(id.substr(0, 1)) & 0x0f,
        worker: characters.indexOf(id.substr(1, 1)) & 0x0f
    };
}

module.exports = decode;

},{"./alphabet":2}],4:[function(require,module,exports){
'use strict';

var randomByte = require('./random/random-byte');

function encode(lookup, number) {
    var loopCounter = 0;
    var done;

    var str = '';

    while (!done) {
        str = str + lookup( ( (number >> (4 * loopCounter)) & 0x0f ) | randomByte() );
        done = number < (Math.pow(16, loopCounter + 1 ) );
        loopCounter++;
    }
    return str;
}

module.exports = encode;

},{"./random/random-byte":7}],5:[function(require,module,exports){
'use strict';

var alphabet = require('./alphabet');
var encode = require('./encode');
var decode = require('./decode');
var isValid = require('./is-valid');

// Ignore all milliseconds before a certain time to reduce the size of the date entropy without sacrificing uniqueness.
// This number should be updated every year or so to keep the generated id short.
// To regenerate `new Date() - 0` and bump the version. Always bump the version!
var REDUCE_TIME = 1459707606518;

// don't change unless we change the algos or REDUCE_TIME
// must be an integer and less than 16
var version = 6;

// if you are using cluster or multiple servers use this to make each instance
// has a unique value for worker
// Note: I don't know if this is automatically set when using third
// party cluster solutions such as pm2.
var clusterWorkerId = require('./util/cluster-worker-id') || 0;

// Counter is used when shortid is called multiple times in one second.
var counter;

// Remember the last time shortid was called in case counter is needed.
var previousSeconds;

/**
 * Generate unique id
 * Returns string id
 */
function generate() {

    var str = '';

    var seconds = Math.floor((Date.now() - REDUCE_TIME) * 0.001);

    if (seconds === previousSeconds) {
        counter++;
    } else {
        counter = 0;
        previousSeconds = seconds;
    }

    str = str + encode(alphabet.lookup, version);
    str = str + encode(alphabet.lookup, clusterWorkerId);
    if (counter > 0) {
        str = str + encode(alphabet.lookup, counter);
    }
    str = str + encode(alphabet.lookup, seconds);

    return str;
}


/**
 * Set the seed.
 * Highly recommended if you don't want people to try to figure out your id schema.
 * exposed as shortid.seed(int)
 * @param seed Integer value to seed the random alphabet.  ALWAYS USE THE SAME SEED or you might get overlaps.
 */
function seed(seedValue) {
    alphabet.seed(seedValue);
    return module.exports;
}

/**
 * Set the cluster worker or machine id
 * exposed as shortid.worker(int)
 * @param workerId worker must be positive integer.  Number less than 16 is recommended.
 * returns shortid module so it can be chained.
 */
function worker(workerId) {
    clusterWorkerId = workerId;
    return module.exports;
}

/**
 *
 * sets new characters to use in the alphabet
 * returns the shuffled alphabet
 */
function characters(newCharacters) {
    if (newCharacters !== undefined) {
        alphabet.characters(newCharacters);
    }

    return alphabet.shuffled();
}


// Export all other functions as properties of the generate function
module.exports = generate;
module.exports.generate = generate;
module.exports.seed = seed;
module.exports.worker = worker;
module.exports.characters = characters;
module.exports.decode = decode;
module.exports.isValid = isValid;

},{"./alphabet":2,"./decode":3,"./encode":4,"./is-valid":6,"./util/cluster-worker-id":9}],6:[function(require,module,exports){
'use strict';
var alphabet = require('./alphabet');

function isShortId(id) {
    if (!id || typeof id !== 'string' || id.length < 6 ) {
        return false;
    }

    var characters = alphabet.characters();
    var len = id.length;
    for(var i = 0; i < len;i++) {
        if (characters.indexOf(id[i]) === -1) {
            return false;
        }
    }
    return true;
}

module.exports = isShortId;

},{"./alphabet":2}],7:[function(require,module,exports){
'use strict';

var crypto = typeof window === 'object' && (window.crypto || window.msCrypto); // IE 11 uses window.msCrypto

function randomByte() {
    if (!crypto || !crypto.getRandomValues) {
        return Math.floor(Math.random() * 256) & 0x30;
    }
    var dest = new Uint8Array(1);
    crypto.getRandomValues(dest);
    return dest[0] & 0x30;
}

module.exports = randomByte;

},{}],8:[function(require,module,exports){
'use strict';

// Found this seed-based random generator somewhere
// Based on The Central Randomizer 1.3 (C) 1997 by Paul Houle (houle@msc.cornell.edu)

var seed = 1;

/**
 * return a random number based on a seed
 * @param seed
 * @returns {number}
 */
function getNextValue() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed/(233280.0);
}

function setSeed(_seed_) {
    seed = _seed_;
}

module.exports = {
    nextValue: getNextValue,
    seed: setSeed
};

},{}],9:[function(require,module,exports){
'use strict';

module.exports = 0;

},{}],10:[function(require,module,exports){
//Get elements we need
var painting = document.getElementById('CanvasContainer');
var canvas = document.getElementById('CollaborativeCanvas');
var clearButton = document.getElementById('clearHistory');

//initalize socket.io
var socket = io();

//initalize shortid
var shortid = require('shortid').generate();

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
  for(var i=0; i < history.length; i++) {
    context.strokeStyle = history[i].color;
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

},{"shortid":1}]},{},[10]);
