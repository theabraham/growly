var net = require('net'),
    crypto = require('crypto'),
    fs = require('fs');

/**
 * Create a new GNTP request of the given `type`.
 *
 * @param {String} type either NOTIFY or REGISTER
 * @api private
 */

function GNTP(type) {
    this.host = 'localhost';
    this.port = 23053;
    this.type = type;
    this.request = 'GNTP/1.0 ' + type + ' NONE\r\n';
    this.resources = '';
    this.attempts = 0;
    this.maxAttempts = 5;
}

/**
 * Append another header `name` with a value of `val` to the request. If `val` is
 * undefined, the header will be left out.
 *
 * @param {String} name
 * @param {String} val
 * @api public
 */

GNTP.prototype.add = function(name, val) {
    var icon, identifier, nl = '\r\n';

    if (val === undefined) 
        return;

    /* Handle icon files when they're not URLs. */
    if (/-Icon/.test(name) && !/^https?:\/\//.test(val) && /\.(png|gif|jpe?g)$/.test(val)) {
        icon = fs.readFileSync(val);
        identifier = crypto.createHash('md5').update(icon).digest('hex');
        val = 'x-growl-resource://' + identifier;

        this.resources += 'Identifier: ' + identifier + nl;
        this.resources += 'Length: ' + icon.length + nl + nl;
        this.resources += icon + nl + nl;
    } 

    this.request += name + ': ' + val + nl;
};

/**
 * Append a newline to the request.
 *
 * @api public
 */

GNTP.prototype.newline = function() {
    this.request += '\r\n';
};

/**
 * Build a response object from the given `resp` response string.
 *
 * The response object has a key/value pair for every header in the response, and 
 * a `.state` property equal to either OK, ERROR, or CALLBACK.
 *
 * An example GNTP response:
 *
 *     GNTP/1.0 -OK NONE\r\n
 *     Response-Action: REGISTER\r\n
 *     \r\n
 *
 *  Which would be parsed to:
 *      
 *      { state: 'OK', 'Response-Action': 'REGISTER' }
 *
 * @param {String} resp
 * @return {Object}
 * @api private
 */

GNTP.prototype.parseResp = function(resp) {
    var parsed = {}, head, body;
    resp = resp.slice(0, resp.indexOf('\r\n\r\n')).split('\r\n');
    head = resp[0];
    body = resp.slice(1);

    parsed.state = head.match(/-(OK|ERROR|CALLBACK)/)[0].slice(1);
    body.forEach(function(ln) {
        ln = ln.split(': ');
        parsed[ln[0]] = ln[1];
    });

    return parsed;
};

/**
 * Call `GNTP.send()` with the given arguments after a certain delay.
 *
 * @api private
 */

GNTP.prototype.retry = function() {
    var self = this, args = arguments;
    setTimeout(function() {
        self.send.apply(self, args);
    }, 750);
};

/**
 * Send the GNTP request, calling `callback` after successfully sending the 
 * request.
 *
 * An example GNTP request:
 *
 *     GNTP/1.0 REGISTER NONE\r\n
 *     Application-Name: Growl.js\r\n
 *     Notifications-Count: 1\r\n
 *     \r\n
 *     Notification-Name: default\r\n
 *     Notification-Display-Name: Default Notification\r\n
 *     Notification-Enabled: True\r\n
 *     \r\n
 * 
 * @param {Function} callback which will be passed the parsed response
 * @api public
 */

GNTP.prototype.send = function(callback) {
    var self = this,
        socket = net.connect(this.port, this.host),
        resp = '';

    this.attempts += 1;

    socket.on('connect', function() {
        socket.write(self.request + self.resources);
    });

    socket.on('data', function(data) {
        resp += data.toString();

        /* Wait until we have a complete response which is signaled by two CRLF's. */
        if (resp.slice(resp.length - 4) !== '\r\n\r\n') return; 

        resp = self.parseResp(resp); 

        /* We have to manually close the connection for certain responses; otherwise,
           reset `resp` to prepare for the next response chunk.  */
        if (resp.state === 'ERROR' || resp.state === 'CALLBACK')
            socket.end();
        else
            resp = '';
    });

    socket.on('end', function() {
        /* Retry on 200 (timed out), 401 (unknown app), 402 (unknown notification). */
        if (['200', '401', '402'].indexOf(resp['Error-Code']) >= 0 && self.attempts <= self.maxAttempts)
            self.retry(callback);
        else
            callback(null, resp);
    });

    socket.on('error', function() {
        callback(new Error('Error while sending request to "'+ host +':'+ port +'"'));
        socket.destroy();
    });
};

/**
 * Interface for registering Growl applications and sending Growl notifications.
 *
 * Initially registers a default Growl application, making registration optional. 
 * Once another application is registered, though, all future notifications will
 * be sent to that application.
 *
 * @api private
 */

function Growl() {
    this.appname = 'Growl.js';
    this.notifications = undefined;
    this.labels = undefined;
    this.count = 0;
    this.register(this.appname);
}

/**
 * Returns an array of label strings extracted from each notification object in 
 * `notifications`.
 *
 * @param {Array} notifications
 * @return {Array}
 * @api private
 */

Growl.prototype.getLabels = function(notifications) {
    return notifications.map(function(notif) {
        return notif.label;
    });
};

/**
 * Register an application with the name `appname` (required), icon `appicon`, and 
 * a list of notification types `notifications`.
 *
 * Each object in the `notifications` array defines a type of notification the
 * application will have with the following properties:
 *
 *  - `.label` name used to identify the type of notification being used (required)
 *  - `.dispname` name users will see in Growl's preference panel
 *  - `.enabled` whether or not notifications of this type are enabled (defaults to false)
 *  - `.icon` default icon notifications of this type should use
 *
 * @param {String} appname
 * @param {String} appicon
 * @param {Array} notifications
 * @api public
 */

Growl.prototype.register = function(appname, appicon, notifications) {
    var req;

    if (typeof appicon === 'object') {
        notifications = appicon;
        appicon = undefined;
    }

    if (notifications === undefined || !notifications.length) {
        notifications = [{ label: 'default', dispname: 'Default Notification', enabled: true }];
    }

    this.appname = appname;
    this.notifications = notifications;
    this.labels = this.getLabels(notifications);

    req = new GNTP('REGISTER');
    req.add('Application-Name', appname);
    req.add('Application-Icon', appicon);
    req.add('Notifications-Count', notifications.length);
    req.newline();

    notifications.forEach(function(notif) {
        req.add('Notification-Name', notif.label);
        req.add('Notification-Display-Name', notif.dispname);
        req.add('Notification-Enabled', notif.enabled ? 'True' : 'False');
        req.add('Notification-Icon', notif.icon);
        req.newline();
    });

    req.send(function(err, resp) {
        if (err) console.log(err);
    });
};

/**
 * Send a notification with `text` content.
 *
 * A notification can have the following `opts` options:
 *
 *  - `.label` type of notification to use (defaults to the first registered type)
 *  - `.title` title of the notification
 *  - `.sticky` whether or not to sticky the notification (defaults to false)
 *  - `.priority` the priority of the notification from lowest (-2) to highest (2)
 *
 * The optional `callback` will be called when the notification is clicked on or closed.
 *
 * @param {String} text
 * @param {Object} opts
 * @param {Function} callback
 * @api public
 */

Growl.prototype.notify = function(text, opts, callback) {
    var req, id = ++this.count;
    opts = opts || {};

    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }

    req = new GNTP('NOTIFY');
    req.add('Application-Name', this.appname);
    req.add('Notification-Name', opts.label || this.labels[0]);
    req.add('Notification-ID', id);
    req.add('Notification-Title', opts.title);
    req.add('Notification-Text', text);
    req.add('Notification-Sticky', opts.sticky ? 'True' : 'False');
    req.add('Notification-Priority', opts.priority);
    req.add('Notification-Icon', opts.icon);
    req.add('Notification-Coalescing-ID', undefined);
    req.add('Notification-Callback-Context', callback ? 'context' : undefined);
    req.add('Notification-Callback-Context-Type', callback ? 'string' : undefined);
    req.add('Notification-Callback-Target', undefined);
    req.newline();

    req.send(function(err, resp) {
        if (err) console.log(err);
        if (resp.state === 'CALLBACK' && callback) {
            callback(resp['Notification-Callback-Result'].toLowerCase());
        }
    });
};

module.exports = new Growl;
