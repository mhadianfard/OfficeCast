(function($) {
    var socket = io();

    /**
     * Cast Object
     * @param id
     * @param shortName
     * @param url
     * @returns {{id: *, shortName: *, url: *, isStarted: boolean}}
     * @constructor
     */
    var Cast = function(id, shortName, url) {
        var cast = {
            id: id,
            shortName: shortName,
            url: url,
            isStarted: false,

            start: function(url)
            {
                if (url) {
                    this.url = url;
                }

                if (!this.url) {
                    alert('No URL specified.');
                    return false;
                }

                if (cast.restartTimer) {
                    cast.restartTimer = null;
                    window.clearTimeout(cast.restartTimer);
                }

                socket.emit('start cast', {
                    id:     this.id,
                    url:    this.url
                });
            },

            stop: function()
            {
                if (cast.restartTimer) {
                    cast.restartTimer = null;
                    window.clearTimeout(cast.restartTimer);
                    this.publish('Stopped.');
                    return;
                }

                socket.emit('stop cast', { id: this.id });
            },

            /**
             * Publish a log statement
             * @param message
             * @param messageType one of "notice", "error", "success", "dynamic"
             * @return jQuery element of log message that was added.
             */
            publish: function(message, messageType)
            {
                messageType = !messageType? 'notice' : messageType;
                var log = this.dom.find('.log');
                var message = $('<div class="' + messageType + '">' + message + '</div>');
                message.attr('title', new Date());
                log.append(message);

                return message;
            },

            /**
             * Count down to restart.
             * @param seconds
             * @param jLogMessage
             */
            autoRestart: function(seconds, jLogMessage)
            {
                var message = 'Restarting in ' + seconds + (seconds == 1 ? ' second.':' seconds.');
                this.restartTimer = null;
                this.dom.find('.control.stop').removeClass('disabled');
                if (!jLogMessage) {
                    jLogMessage = this.publish(message, 'dynamic');

                } else {
                    jLogMessage.html(message);
                }

                if (seconds == 0) {
                    jLogMessage.html('Restarting.');
                    this.start();
                    return;
                }

                var cast = this;
                this.restartTimer = window.setTimeout(function() {
                    seconds--;
                    cast.autoRestart(seconds, jLogMessage);
                }, 1000);
            }
        }

        window.OfficeCast.casts[cast.id] = cast;
        return cast;
    };

    /**
     * OfficeCast App
     */
    window.OfficeCast =
    {
        casts: {},

        config: {
            restartTime: 30,    // seconds
        },

        addCast: function(castName, castUrl)
        {
            var id = Object.keys(this.casts).length;
            var cast = new Cast(id, castName, castUrl);
            var template = this._loadTemplateHtml('cast');
            cast.dom = $(template);

            $('.casts').append(cast.dom);
            cast.dom.find('.title').html(castName);
            if (castUrl) {
                cast.dom.find('input.url').val(castUrl);
                cast.dom.find('.control.start').removeClass('disabled');
            }

            cast.dom.find('.control.start').click(function() {
                cast.start();
            });
            cast.dom.find('.control.stop').click(function() {
                cast.stop();
            });
            cast.dom.find('.control.restart').click(function() {
                cast.stop();
                cast.autoRestart(OfficeCast.config.restartTime);
            });
            socket.emit('new cast', cast);
            return cast;
        },

        _loadTemplateHtml: function(templateName)
        {
            return $('script#template-' + templateName).html();
        },

        _getCast: function(castId)
        {
            var cast = this.casts[castId];
            if (!cast) {
                alert('unrecognized cast id: ' + data.id);
            }

            return cast;
        }
    };

    /**
     * Socket Setup
     */
    socket.on('connect', function() {
        $('.connection').removeClass('offline').addClass('online');
        $('.connection .status').html('connected');
    });

    socket.on('disconnect', function() {
        $('.connection').removeClass('online').addClass('offline');
        $('.connection .status').html('disconnected');
        socket.on('connect', function() {
            location.reload();
        });
    });

    socket.on('cast error', function(message) {
        alert("[FROM SERVER]:\n\n" + message);
    });

    socket.on('cast output', function(data) {
        var cast = OfficeCast._getCast(data.id);
        cast.publish(data.message, data.type);
    });

    socket.on('cast started', function(data) {
        var cast = OfficeCast._getCast(data.id);
        cast.url = data.url;
        cast.isStarted = data.isStarted;
        cast.dom.find('input.url').prop('disabled', true);
        cast.dom.find('.control.start').addClass('disabled');
        cast.dom.find('.control.stop').removeClass('disabled');
        cast.dom.find('.control.restart').removeClass('disabled');
    });

    socket.on('cast close', function(data) {
        var cast = OfficeCast._getCast(data.id);
        cast.isStarted = false;

        cast.publish('Cast Stopped.', 'error');
        cast.dom.find('input.url').prop('disabled', false);
        cast.dom.find('.control.start').removeClass('disabled');
        cast.dom.find('.control.stop').addClass('disabled');
        cast.dom.find('.control.restart').addClass('disabled');
        if (data.code != 0) {
            cast.autoRestart(OfficeCast.config.restartTime);
        }
    });

    /**
     * Execute on page load
     */
    $(function() {

    });
})(jQuery);
