(function () {
    var View = Backbone.View.extend({
        events: {
            'click .save': 'saveSettings'
        },

        initialize: function (options) {
            var settings = _kiwi.global.settings;

            this.$el = $($('#tmpl_applet_settings').html());

            this.$el.find('.setting-theme').val(settings.get('theme'));
            this.$el.find('.setting-scrollback').val(settings.get('scrollback'));
        },
        
        saveSettings: function () {
            var settings = _kiwi.global.settings;

            settings.set('theme', $('.setting-theme', this.$el).val());
            settings.set('scrollback', $('.setting-scrollback', this.$el).val());

            settings.save();
        }
    });



    _kiwi.applets.Settings = Backbone.Model.extend({
        initialize: function () {
            this.set('title', 'Settings');
            this.view = new View();
        }
    });
})();