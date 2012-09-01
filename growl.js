var net = require('net');
var events = require('events');


function sendRequest(req, callback, attempts) {
    var host = 'localhost', 
        port = 23053, 
        maxAttempts = 5,
        waitFor = 750,
        resp = '',
        socket = net.connect(port, host, function() {
            socket.write(req);
        });

    attempts = attempts || 0;

    socket.on('data', function(data) {
        resp += data.toString();
        if (resp.slice(resp.length - 4) === '\r\n\r\n') { // ends with two CRLF, we have a complete response
            resp = parseResponse(resp); 
            console.log(resp);
            if (resp.state === 'ERROR' || resp.state === 'CALLBACK') { // ERROR and CALLBACK don't close connection automatically
                socket.end();
            } else { // make response a string again, so the next complete response will be alone
                resp = '';
            }
        }
    });

    socket.on('end', function() {
        /* Retry on 200 (timed out), 401 (unknown app), 402 (unknown notification). */
        if (['200', '401', '402'].indexOf(resp['Error-Code']) >= 0 && attempts < maxAttempts) {
            setTimeout(function() {
                attempts += 1;
                sendRequest(req, callback, attempts);
            }, waitFor);
        } else {
            callback(null, resp);
        }
    });

    socket.on('error', function() {
        callback(new Error('Error while sending request to "'+ host +':'+ port +'"'));
        socket.destroy();
    });
}


function parseResponse(response) {
    var parsed = {};

    response = response.toString()
        .split('\r\n')
        .filter(function(ln) {
            return ln.trim() !== '';
        });

    parsed.state = response[0].match(/-[A-Z]*/)[0].slice(1);

    response.slice(1).forEach(function(ln) {
        ln = ln.split(': ');
        parsed[ln[0]] = ln[1];
    });

    return parsed;
}


function buildRequest(type, headers) {
    var crlf = '\r\n',
        request = 'GNTP/1.0 '+ type +' NONE'+ crlf;

    headers = headers.map(function(header) {
        var field, value;
        if (header === null) return crlf;
        field = Object.keys(header)[0];
        value = header[field];
        if (header.required || value !== undefined) 
            return field +': '+ value + crlf;
    });
    
    headers = headers.filter(function(header) {
        return header !== undefined;
    });

    return request + headers.join('');
}


function getLabels(notifications) {
    return notifications.map(function(notif) {
        return notif.label;
    });
}


function Growl() {
    this.appname = 'Growl.js';
    this.notifications = undefined;
    this.labels = undefined;
    this.count = 0;
    this.register(this.appname, this.notifications);
}


Growl.prototype.register = function(appname, appicon, notifications) {
    var headers;

    if (typeof appicon === 'object') {
        notifications = appicon;
        appicon = undefined;
    }

    if (notifications === undefined || !notifications.length) {
        notifications = [{ label: 'default', dispname: 'Default Notification', enabled: true }];
    }

    this.appname = appname;
    this.notifications = notifications;
    this.labels = getLabels(notifications);

    headers = [
        { 'Application-Name': appname, required: true },
        { 'Application-Icon': appicon },
        { 'Notifications-Count': notifications.length, required: true },
        null
    ];

    notifications.forEach(function(notif) {
        headers = headers.concat([
            { 'Notification-Name': notif.label, required: true },
            { 'Notification-Display-Name': notif.dispname },
            { 'Notification-Enabled': notif.enabled ? 'True' : 'False' },
            { 'Notification-Icon': undefined },
            null
        ]);
    });

    sendRequest(buildRequest('REGISTER', headers), function(err, resp) {
        if (err) console.log(err);
    });
};


Growl.prototype.notify = function(text, opts, callback) {
    var headers;
    opts = opts || {};

    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }

    this.count += 1;

    headers = [
        { 'Application-Name': this.appname, required: true },
        { 'Notification-Name': opts.label || this.labels[0], required: true },
        { 'Notification-ID': this.count },
        { 'Notification-Title': opts.title },
        { 'Notification-Text': text },
        { 'Notification-Sticky': opts.sticky ? 'True' : 'False' },
        { 'Notification-Priority': opts.priority },
        { 'Notification-Icon': opts.icon },
        { 'Notification-Coalescing-ID': opts.replace },
        { 'Notification-Callback-Context': callback ? 'context' : undefined },
        { 'Notification-Callback-Context-Type': callback ? 'string' : undefined },
        { 'Notification-Callback-Target': undefined },
        null
    ];

    sendRequest(buildRequest('NOTIFY', headers), function(err, resp) {
        if (err) console.log(err);
        if (resp.state === 'CALLBACK' && callback) {
            callback(resp['Notification-Callback-Result'].toLowerCase());
        }
    });
};


module.exports = new Growl;
