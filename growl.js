var net = require('net');

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
        return (typeof args[number] != 'undefined' ? args[number] : match);
    });
};

/* Send a "Growl Network Transfer Protocol" (GNTP) request to the local growl
   server, with default port of 23053. Callback is given a GNTP response. */
function sendRequest(request, callback) {
    var host = 'localhost', port = 23053, socket;

    socket = net.connect(port, host, function() {
        socket.write(request);
    });

    socket.on('error', function() {
        callback(new Error('Error while sending request to "{0}:{1}"'.format(host, port)));
        socket.destroy();
    });

    socket.on('data', function(response) {
        callback(null, response);
        socket.end();
    });
}

/* Parse a GNTP response by separating the header and body. */
function parseResponse(response) {
    var parsed = {}, header, body;
    response = response.split('\r\n');

    header = response[0];
    body = response.slice(1);

    parsed.state = header.match(/-[A-Z]*/)[0];
    parsed.body = {}; 
    body.forEach(function(line) {
        line = line.split(': ');
        parsed.body[line[0]] = line[1];
    });

    console.log(parsed);
}

function createNotifier(name, labels) {
    return function(text, label, options, callback) {
        var request;

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        /* Build up GNTP notify request for the given application. */
        request = '';
        request += 'GNTP/1.0 NOTIFY NONE\r\n'
        request += 'Application-Name: {0}\r\n'.format(name);
        request += 'Notification-Name: {0}\r\n'.format(label);
        request += 'Notification-Text: {0}\r\n'.format(text);

        if (options && options.title) {
            request += 'Notification-Title: {0}\r\n'.format(options.title);
        }

        if (options && typeof options.sticky === 'boolean') {
            request += 'Notification-Sticky: {0}\r\n'.format(options.sticky.toString().capitalize());
        }
        
        request += 'Notification-ID: 1234\r\n';
        request += 'Notification-Coalescing-ID: 1234\r\n';
        request += 'Notification-Callback-Context: SOMECONTEX\r\n';
        request += 'Notification-Callback-Context-Type: string\r\n\r\n';

        /* Send GNTP notify request. */
        sendRequest(request, function(err, response) {
            if (err) {
                console.log('Notify failed:', err);
            }

            console.log(response.toString());
        });
    }; 
}

function register(name, notifications, icon) {
    var request, labels;
    icon = icon || '';

    /* Build up GNTP register request for this application and its 
       notifications. */
    request = '';
    request += 'GNTP/1.0 REGISTER NONE\r\n';
    request += 'Application-Name: {0}\r\n'.format(name);
    request += 'Notifications-Count: {0}\r\n\r\n'.format(notifications.length);
    
    labels = [];
    notifications.forEach(function(notification) {
        labels.push(notification.label);
        request += 'Notification-Name: {0}\r\n'.format(notification.label);
        request += 'Notification-Display-Name: {0}\r\n'.format(notification.name || notification.label);
        request += 'Notification-Enabled: {0}\r\n\r\n'.format(notification.enabled.toString().capitalize());
    });

    /* Send registration request. */
    sendRequest(request, function(err, response) {
        console.log(response.toString());
    });

    return createNotifier(name, labels);
}

exports.register = register;
