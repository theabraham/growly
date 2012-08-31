var net = require('net');
var events = require('events');

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
        return (typeof args[number] != 'undefined' ? args[number] : match);
    });
};

function checkError(err) {
    if (err) {
        console.log(err);
    }
}

/* Send a "Growl Network Transfer Protocol" (GNTP) request to the local growl
   server, with default port of 23053. Callback is given a GNTP response. An 
   example GNTP request: 

   GNTP/1.0 REGISTER NONE
   Application-Name: SurfWriter
   Notifications-Count: 1

   Notification-Name: Download Complete
   Notification-Display-Name: Download completed
   Notification-Enabled: True */

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
        //socket.end();
    });
}

/* Parse a GNTP response and return its state (OK, ERROR, CALLBACK) and the
   headers. An example GNTP response: 

   GNTP/1.0 -OK NONE
   Response-Action: REGISTER */

function parseResponse(response) {
    var parsed, headers;
    console.log('resp',response.toString());
    response = response.toString().split('\r\n');

    parsed = { 
        state: response[0].match(/-[A-Z]*/)[0].slice(1), 
        headers: {} 
    };

    headers = response.slice(1).filter(function(line) {
        return line.trim().length > 0;
    });

    headers.forEach(function(line) {
        line = line.split(': ');
        parsed.headers[line[0]] = line[1];
    });

    return parsed;
}

/* ... */

function createNotifier(name, labels) {
    var count = 0;

    /* ... */

    return function(text, options, callback) {
        events.EventEmitter.call(this);
        var request, attempts;

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        /* Build up GNTP notify request for the given application. */
        request = '';
        request += 'GNTP/1.0 NOTIFY NONE\r\n'
        request += 'Application-Name: {0}\r\n'.format(name);
        request += 'Notification-Text: {0}\r\n'.format(text);

        if (options && options.label) {
            request += 'Notification-Name: {0}\r\n'.format(options.label);
        } else {
            request += 'Notification-Name: {0}\r\n'.format(labels[0]);
        }

        if (options && options.title) {
            request += 'Notification-Title: {0}\r\n'.format(options.title);
        }

        if (options && typeof options.sticky === 'boolean') {
            request += 'Notification-Sticky: {0}\r\n'.format(options.sticky.toString().capitalize());
        }

        count += 1;
        request += 'Notification-ID: {0}\r\n'.format(count);
        request += 'Notification-Coalescing-ID: {0}\r\n'.format(options.replace || count);
        request += 'Notification-Callback-Context: SOMECONTEXT\r\n';
        request += 'Notification-Callback-Context-Type: string\r\n';
        request += '\r\n';

        /* Send GNTP notify request. */
        attempts = 0;
        function sendNotification(id) {
            sendRequest(request, function(err, response) {
                checkError(err);

                response = parseResponse(response);

                /* ... */
                if (response.headers['Error-Code'] == 402 && attempts < 10) {
                    setTimeout(sendNotification, 250 * (++attempts));
                }
            });
        }

        sendNotification(count);

        return count;
    }; 
}

/* ... explain arguments */

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
        checkError(err);
        parseResponse(response);
    });

    return createNotifier(name, labels);
}

exports.register = register;
