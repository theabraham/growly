var growly = require('../lib/growly.js');

var muffinopts = { label: 'muffin', icon: 'muffin.png' },
    cakeopts = { label: 'cake', title: 'Cake is ready!', icon: 'cake.png', sticky: true };

growly.register('Bakery', 'muffin.png', [
    { label: 'muffin', dispname: 'Muffin' },
    { label: 'cake', dispname: 'Cake' }
]);

growly.notify('Looks like it is half past muffin time!', muffinopts);

growly.notify('Click to deliver', cakeopts, function(err, action) {
    console.log('You', action, 'the notification, so the cake is on its way!');
});

