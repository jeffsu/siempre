(function() {
  $(function() {
    $('.stop').click(function() {
      var name;
      name = $(this).data('name');
      $(this).html('Stopping...').addClass('btn-default').removeClass('btn-danger');
      return $.post("/processes/" + name + "/stop", function(data) {
        return setTimeout((function() {
          return location.reload();
        }), 2000);
      });
    });
    return $('.start').click(function() {
      var name;
      name = $(this).data('name');
      $(this).html('Starting...').addClass('btn-default').removeClass('btn-primary');
      return $.post("/processes/" + name + "/start", function(data) {
        return setTimeout((function() {
          return location.reload();
        }), 2000);
      });
    });
  });

}).call(this);
