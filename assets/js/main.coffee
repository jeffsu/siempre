
$ ->
  $('.stop').click ->
    name = $(this).data('name')
    $(this).html('Stopping...').addClass('btn-default').removeClass('btn-danger')
    $.post "/processes/#{name}/stop", (data) ->
      setTimeout (-> location.reload()), 2000

  $('.start').click ->
    name = $(this).data('name')
    $(this).html('Starting...').addClass('btn-default').removeClass('btn-primary')
    $.post "/processes/#{name}/start", (data) ->
      setTimeout (-> location.reload()), 2000

