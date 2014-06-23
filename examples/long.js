setInterval(function () { console.log("long") }, 1000)
process.on('SIGTERM', function() {
  while(true) { a = 1; }
});
