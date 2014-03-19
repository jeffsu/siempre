siempre
=======

A very simple web app that wraps "forever".


Installation
------------

    npm install -g siempre

Usage
-----

    siempre ./config.yaml


Configfile
----------

The config file can be yaml or json.

```yaml
# port number for webserver to run on
port: 5000

processes:
  test:
    command: [ "node", "./test.js" ]
    disabled: true
```

Under processes, its a key/value pair where the key is the name (or uid) of the process
and the value is the options object being passed into forever-monitor.  In addition to
the standard options, there are 2 more included:

  * command: Array (representing the command and its arguments)
  * disabled: Boolean (whether to run on startup or not) 
