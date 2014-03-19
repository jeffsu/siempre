$ ->
  $err = $('.err')
  $out = $('.out')

  socket = io.connect()
  socket.emit 'tail', { name: $('h2.name').html() }

  socket.on 'err', (err) -> $err.append(err)
  socket.on 'out', (out) -> $out.append(out)
