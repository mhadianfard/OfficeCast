const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const spawn = require('child_process').spawn;
const fs = require('fs');

/**
 * Read Input File casts.json
 */
var casts;
try {
    var file = fs.readFileSync('casts.json', 'utf8');
    casts = JSON.parse(file);

} catch (err) {
    casts = {};
}

/**
 * Initialize OfficeCast
 *
 */
var OfficeCast = {
    casts: casts,

    _getCast: function(castId)
    {
        var cast = this.casts[castId];
        if (!cast) {
            io.emit('cast error', 'Specified cast ('+castId+') does not exist');
        }

        return cast;
    }
};

/**
 * Socket Setup
 *
 */
io.on('connection', function(socket) {
    console.log('Client Connected');

    socket.on('disconnect', function() {
       console.log('Client Disconnected');
    });

    socket.on('cast added', function(data) {
        var cast = OfficeCast._getCast(data.id);
        console.log('Re-added: ', cast.shortName);
    });

    socket.on('new cast', function(cast) {
        console.log('New Cast: ', cast.shortName);
        cast.process = null;
        OfficeCast.casts[cast.id] = cast;
    });

    socket.on('start cast', function(data) {
        var cast = OfficeCast._getCast(data.id);
        if (cast.isStarted) {
            io.emit('cast output', {
                id: cast.id,
                message: "Already started.",
                type: 'notice'
            });
            return;
        }
        console.log('Starting ' + cast.shortName + ': ', cast.url);
        cast.url = data.url;
        cast.process = spawn('node', ['cli/cast', cast.shortName, cast.url]);
        cast.isStarted = true;
        io.emit('cast started', {
            id: cast.id,
            url: cast.url,
            isStarted: cast.isStarted,
        });

        cast.process.stdout.on('data', function(data) {
            io.emit('cast output', {
                id: cast.id,
                message: data.toString().replace("\n", "<br/>"),
                type: 'success'
            });
        });

        cast.process.stderr.on('data', function(data) {
            var message = data.toString().replace("\n", "<br/>");
            if (message.indexOf('*** WARNING ***') != -1) {
                // Ignore Avahi Warnings
                return;
            }
            io.emit('cast output', {
                id: cast.id,
                message: message,
                type: 'error'
            });
        });

        cast.process.on('close', function(code) {
            console.log('Ended ' + cast.shortName + '.');
            if (cast.killTimer) {
                clearTimeout(cast.killTimer);
                cast.killTimer = null;
            }
            cast.isStarted = false;
            io.emit('cast close', {
                id: cast.id,
                isStarted: cast.isStarted,
                code: code
            });
        });
    });

    socket.on('stop cast', function(data) {
        var cast = OfficeCast._getCast(data.id);
        if (!cast.isStarted) {
            io.emit('cast output', {
                id: cast.id,
                message: "Already stopped.",
                type: 'notice'
            });
            return;
        }

        cast.process.stdin.write('exit');
        cast.killTimer = setTimeout(function() {
            io.emit('cast output', {
                id: cast.id,
                message: "Forcing exit.",
                type: 'error'
            });
            cast.killTimer = null;
            cast.process.kill();
        }, 1000);
    });
});


/**
 * Server
 */
app.use(express.static('public'));

app.get('/casts', function(request, response) {
    var data = [];
    for (var id in OfficeCast.casts) {
        var cast = OfficeCast.casts[id];
        data.push({
            id:         cast.id,
            shortName:  cast.shortName,
            url:        cast.url,
            isStarted:  cast.isStarted
        });
    }
    response.send(data);
});

http.listen(80, function() {
    console.log('listening on *:80');
});