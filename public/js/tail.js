(function() {
  $(function() {
    var $err, $out, socket;
    $err = $('.err');
    $out = $('.out');
    socket = io.connect();
    socket.emit('tail', {
      name: $('h2.name').html()
    });
    socket.on('err', function(err) {
      return $err.append(err);
    });
    return socket.on('out', function(out) {
      return $out.append(out);
    });
  });

}).call(this);
