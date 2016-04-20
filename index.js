const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const childProcess = require('child_process');
var spawn = childProcess.spawn;

var OfficeCast = {
    casts: {},
};



/**
 * Socket Setup
 */
io.on('connection', function(socket) {
    console.log('Client Connected');

    socket.on('disconnect', function() {
       console.log('Client Disconnected');
    });

    socket.on('new cast', function(cast) {
        console.log('New Cast: ', cast.shortName);
        cast.process = null;
        OfficeCast.casts[cast.id] = cast;
    });

    socket.on('start cast', function(data) {
        var cast = OfficeCast.casts[data.id];
        if (!cast) {
            socket.emit('cast error', 'Specified cast ('+data.id+') does not exist');
            return;
        }
        cast.url = data.url;
        cast.process = spawn('node', ['cli/cast', cast.shortName, cast.url]);
        cast.process.stdout.on('data', function(data) {
            socket.emit('cast output', {
                id: cast.id,
                message: String.fromCharCode.apply(null, data),
                type: 'stdout'
            });
        });
        cast.process.stderr.on('data', function(data) {
            socket.emit('cast output', {
                id: cast.id,
                message: String.fromCharCode.apply(null, data),
                type: 'stderr'
            });
        });
        cast.process.on('close', function(code) {
            socket.emit('cast close', {
                id: cast.id,
                code: code
            });
        });
    });
});





/**
 * Server
 */
app.use(express.static('public'));
http.listen(3000, function(){
    console.log('listening on *:3000');
});