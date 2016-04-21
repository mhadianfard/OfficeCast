#!/usr/bin/env node

// var Firebase = require("firebase");
const util = require("util");
const nodecastor = require("nodecastor");
const EventEmitter = require('events');


function startApplication(deviceShortName, dashboardUrl)
{
  nodecastor.scan().on('online', function(device) {

    device.isDevice = function(shortname) {
      return this.friendlyName.toUpperCase().indexOf(shortname.toUpperCase()) >= 0;
    }

    device.on('connect', function() {
      device.status(function(err, status) {
        if (!err) {
          device.application('5C3F0A3C', function(err, application) {
            if (!err) {
              if (device.isDevice(deviceShortName)){
                device.channel.on('disconnect', function() {
                  throw new Error("Disconnected");
                });
                application.run('urn:x-cast:es.offd.dashcast', function(err, session) {
                  if (!err) {
                    console.log("Connected to " + device.friendlyName);
                    console.log("Broadcasting " + dashboardUrl);
                    session.send({
                      url: dashboardUrl,
                      force: true
                    });
                  }
                });
              }
            }
          });
        }
      });
    });
  }).on('offline', function(device) {
    console.log('Removed device: ', device.friendlyName);

  }).on('status', function(status) {
    console.log('Chromecast status updated', util.inspect(status));

  }).on('disconnect', function(err) {
    console.log('DEVICE DISCONNECTED', err);

  }).start();
}

process.on('uncaughtException', function(err) {
  console.error(err.toString().replace('[','').replace(']',''));
  process.exit(2);
});

process.stdin.on('readable', function(data) {
    var chunk = process.stdin.read();
    if (chunk !== null) {
        var input = chunk.toString().trim();
        if (input.toLocaleLowerCase() === "exit") {
            console.log('Disconnecting.');
            process.exit(0);
        }
    }
});

var args = process.argv.slice(2);
if (args.length < 2) {
  var executable = process.argv[1].substr(process.argv[1].lastIndexOf('/') + 1);
  console.log("\tUsage: " + executable + " deviceShortName dashboardUrl");
  console.log("\tExample: " + executable + " \"Cast A\" http://sweettoothrewards.com\n\n");
  process.exit(1);
}
startApplication(args[0], args[1]);