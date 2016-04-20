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
                socket.emit('start cast', {
                    id:     this.id,
                    url:    this.url
                });
            },

            publish: function(message, messageType)
            {
                messageType = !messageType? 'notice' : messageType;
                var logs = this.dom.find('.log');
                logs.append('<div class="' + messageType + '">' + message + '</div>');
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

            cast.dom.find('.control.start').click(function(){
               cast.start();
            });

            socket.emit('new cast', cast);
            return cast;
        },

        _loadTemplateHtml: function(templateName)
        {
            return $('script#template-' + templateName).html();
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
        var cast = OfficeCast.casts[data.id];
        if (!cast) {
            alert('unrecognized cast id: ' + data.id);
        }
        cast.publish(data.message);
    });


    /**
     * Execute on page load
     */
    $(function() {

    });
})(jQuery);
