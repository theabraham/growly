# Growly #

Simple zero-dependency Growl notifications using GNTP.

## Installation ##

Install growly using `npm`:

```
npm install growly
```

And then require it:

```javascript
var growly = require('growly');
```

This module uses the Growl Network Transport Protocol (GNTP) which was implemented in Growl since version 1.3, so you **must have an appropriate version of Growl installed** for Growly to work.

## Example ##

Sending a minimal Growl notification:

```javascript
var growly = require('growly');

growly.notify('This is as easy as it gets', { title: 'Hello, World!' });
```

More examples can be found in the *example/* directory.

## Usage ##

The growly module exposes only two methods: `Growly.register()` and `Growly.notify()`. 

### Growly.register(appname, [appicon], [notifications]) ###

Registers a new application with Growl. Registration is completely optional. Useful if you want your application, with its own icon and types of notifications, to show up in Growl's prefence panel.

  - `appname` the name of the application (required.)
  - `appicon` url, file path, or Buffer instance for an application icon image.
  - `notifications` a list of defined notification types with the following properties:
    - `.label` name used to identify the type of notification being used (required.)
    - `.dispname` name users will see in Growl's preference panel (defaults to `.label`.)
    - `.enabled` whether or not notifications of this type are enabled (defaults to true.)

An example:

```javascript
growly.register('My Application', 'path/to/icon.png', [
    { label: 'success', dispname: 'Success' },
    { label: 'warning', dispname: 'Warning', enabled: false }
]);
```

### Growly.notify(text, [opts], [callback]) ###

Sends a Growl notification. If an application wasn't registered beforehand with `growly.register()`, a default application will be used internally.

  - `text` the body of the notification.
  - `opts` an object with the following properties:
    - `.title` title of the notification.
    - `.icon` url, file path, or Buffer instance for the notification.
    - `.sticky` whether or not to sticky the notification (defaults to false.)
    - `.label` type of notification to use (defaults to the first registered notification type.)
    - `.priority` the priority of the notification from lowest (-2) to highest (2).
  - `callback` called when the user has closed/clicked the notification. The callback is passed an Error object `err` as the first argument when the notification fails; otherwise, the second argument `action` is a string that'll describe which action has been taken by the user (either 'closed' or 'clicked'.)

An example:

```javascript
/* Assuming an application was registered with a notification type labeled 'warning'. */
growly.notify('Stuffs broken!', { label: 'warning' }, function(err, action) {
    console.log('Action:', action);
});
```

## License ##

Copyright (C) 2012 Ibrahim Al-Rajhi <abrahamalrajhi@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
