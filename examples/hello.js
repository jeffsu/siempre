setInterval(function () { console.log("hello") }, 1000);
var cp = require('child_process');
var child = cp.spawn("node", [ "./examples/child.js" ], { stdio: 'inherit' });
