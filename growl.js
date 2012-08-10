var net = require('net');
var color = require('color-terminal');

function Growl(applicationName, host, port) {
    this.applicationName = applicationName || 'Growl.js';
    this.host = host || 'localhost';
    this.port = port || 23053;
    this.register();
}

Growl.prototype.register = function() {
    this.gntp(
        'GNTP/1.0 REGISTER NONE\r\n' +
        'Application-Name: ButtHurt\r\n' +
        'Notifications-Count: 1\r\n' +
        '\r\n' +
        'Notification-Name: General Notification\r\n' +
        'Notification-Enabled: True\r\n' +
        '\r\n'
    );
};

Growl.prototype.notify = function(title, text) {
    this.gntp(
        'GNTP/1.0 NOTIFY NONE\r\n' +
        'Application-Name: ButtHurt\r\n' +
        'Notification-Name: General Notification\r\n' +
        'Notification-Title: '+ title +'\r\n' +
        'Notification-Text: '+ text +'\r\n' +
        '\r\n'
    );
};

Growl.prototype.gntp = function(request) {
    var client = net.connect({ port: this.port }, function() {
        request.color('green');
        client.write(request);
    });

    client.on('data', function(data) {
        data.toString().color('yellow');
    });
};

var me = new Growl();
setTimeout(function() {
me.notify('Hello There!', 'This is an example message.');
}, 500);


    /* Register with Growl. */
    /*
    var tcp = net.connect({ port: this.port }, function() {
        //tcp.write('GNTP/1.0 REGISTER NONE\r\n' +
        // 'Application-Name: MyApplication\r\n' +
        // 'Notification-Count: 1\r\n' +
        // '\r\n' +
        // 'Notification-Name: GenericNotification\r\n' +
        // 'Notification-Enabled: True\r\n' +
        // '\r\n'); 
    });

    tcp.on('data', function(data) {
        console.log('RESPONSE:');
        console.log(data.toString());
        console.log('-------------------------');
    });
    */

/*
Growl.prototype.notify = function(title, text) {
    var tcp = net.connect({ port: 23053 }, function() {
        tcp.write('GNTP/1.0 NOTIFY NONE\r\n');
        tcp.write('Application-Name: MyApplication\r\n');
        tcp.write('Notification-Name: SomeNotification\r\n');
        tcp.write('Notification-Title: Renold\r\n');
        tcp.write('Notification-Text: Hello, world\r\n');
        tcp.write('\r\n');
    });

    tcp.on('data', function(data) {
        console.log('RESPONSE:');
        console.log(data.toString());
        console.log('-------------------------');
    });
};

var me = new Growl(); 
me.notify('Hello There', 'This must work');
*/
