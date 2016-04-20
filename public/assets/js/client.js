(function($){
    window.OfficeCast =
    {
        casts: {},

        addCast: function(castName, castUrl)
        {
            var template = this._loadTemplateHtml('cast');
            var dom = $(template);

            $('.casts').append(dom);
            dom.find('.title').html(castName);
            if (castUrl) {
                dom.find('input.url').val(castUrl);
                dom.find('.control.start').removeClass('disabled');
            }

            var cast = {
                id: Object.keys(this.casts).length,
                shortName: castName,
                url: castUrl,
                dom: dom,
                isStarted: false,
            };

            this.casts[cast.id] = cast;
            return cast;
        },

        _loadTemplateHtml: function(templateName)
        {
            return $('script#template-' + templateName).html();
        }
    };
})(jQuery);
