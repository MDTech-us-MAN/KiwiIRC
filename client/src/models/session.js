_kiwi.model.Session = Backbone.Model.extend({
    defaults: {
        synced: false
    },

	initialize: function() {
        this.available_connections = new Backbone.Collection();
	},


	save: function(username, password) {
		var that = this;

		var fn = function(err, data) {
			that.trigger('save', err, data);
		};

        _kiwi.gateway.rpc.call('kiwi.session_save', {
            username: username,
            password: password,
        }, fn);
	},


	resume: function(username, password) {
		var that = this;

        var fn = function() {
            _kiwi.gateway.rpc.call('kiwi.session_resume', {
                username: username,
                password: password,
            }, _.bind(that._resumeCallback, that));
        };

        if (_kiwi.gateway.isConnected()) {
            fn();
        } else {
            _kiwi.gateway.connect(fn);
        }
	},


	_resumeCallback: function(err, data) {
        var that = this;

		if (err) {
			this.trigger('sync_error', err);
			return;
		}

        _.each(data, function(connection) {
            var con = new Backbone.Model({
                connection_id: connection.connection_id,
                nick: connection.nick,
                address: connection.address,
                port: connection.port,
                ssl: connection.ssl,
                options: connection.options
            });

            var channels = new Backbone.Collection();
            _.each(connection.channels, function(channel_info, idx) {
                channels.add(new Backbone.Model({name: channel_info.name}));
            });

            con.set('channels', channels);

            that.available_connections.add(con);
        });

        this.set('synced', true);
        this.trigger('synced', data);

	},


    syncEvents: function(network_id, target, callback) {
        if (typeof target === 'function' && !callback) {
            callback = target;
            target = undefined;
        }

        var connection = this.available_connections.findWhere({connection_id: network_id});
        if (!connection) {
            return false;
        }

        if (!connection.synced) {
            this._syncConnection(connection);
            connection.synced = true;
        }

        connection.get('channels').forEach(function(channel_info, idx) {
            var channel, synced_connection;

            synced_connection = _kiwi.app.connections.getByConnectionId(network_id);

            // Make sure we only create panels for specified targets. All targets if not specified
            if (target && target.toLowerCase() !== channel_info.get('name').toLowerCase()) {
                return;
            }

            channel = synced_connection.panels.getByName(channel_info.get('name'));
            if (!channel) {
                channel = new _kiwi.model.Channel({name: channel_info.get('name'), network: synced_connection});
                synced_connection.panels.add(channel);
            }
        });

        _kiwi.gateway.rpc.call('kiwi.session_events', {
            connection_id: network_id,
            target: target,
        }, callback);
    },


    unsubscribeTarget: function(network_id, target) {
        var connection = this.available_connections.findWhere({connection_id: network_id});
        if (!connection) {
            return false;
        }

        // Not a synced connection? Nothing to do.
        if (!connection.synced) {
            return;
        }

        _kiwi.gateway.rpc.call('kiwi.session_unsubscribe', {
            connection_id: network_id,
            target: target,
        }, function() {
            var synced_connection = _kiwi.app.connections.getByConnectionId(network_id);
            if (!synced_connection) {
                return;
            }

            var panel = synced_connection.panels.getByName(target);
            if (!panel) {
                return;
            }

            panel.close();
        });
    },


    _syncConnection: function(connection) {
        var new_connection, options;

        new_connection = new _kiwi.model.Network({
            connection_id: connection.get('connection_id'),
            nick: connection.get('nick'),
            address: connection.get('address'),
            port: connection.get('port'),
            ssl: connection.get('ssl')
        });

        options = connection.get('options');
        _kiwi.gateway.trigger('connection:' + connection.get('connection_id').toString(), {
            event_name: 'options',
            event_data: {options: options.options, cap: options.cap}
        });

        _kiwi.app.connections.add(new_connection);

        // Let the application know we have connected to an IRCd
        _kiwi.gateway.trigger('connection:connect', {
            server: connection.get('connection_id'),
            nick: connection.get('nick')
        });
    }
});