'use strict';

var initialized = false;
var NAMESPACE = '/calendars';
var jcalHelper = require('../lib/jcal/jcalHelper');

function notify(io, ioHelper, event, msg) {
  var clientSockets = ioHelper.getUserSocketsFromNamespace(msg.target._id, io.of(NAMESPACE).sockets);
  if (!clientSockets) {
    return;
  }

  clientSockets.forEach(function(socket) {
    socket.emit(event, msg.event);
  });
}

function init(dependencies) {
  var logger = dependencies('logger');
  var pubsub = dependencies('pubsub');
  var io = dependencies('wsserver').io;
  var ioHelper = dependencies('wsserver').ioHelper;
  var userModule = dependencies('user');

  if (initialized) {
    logger.warn('The calendar notification service is already initialized');
    return;
  }

  pubsub.global.topic('calendar:event:updated').subscribe(function(msg) {
    notify(io, ioHelper, 'event:updated', msg);
  });

  io.of(NAMESPACE)
    .on('connection', function(socket) {
      logger.info('New connection on ' + NAMESPACE);

      socket.on('subscribe', function(uuid) {
        logger.info('Joining room', uuid);
        socket.join(uuid);
      });

      socket.on('unsubscribe', function(uuid) {
        logger.info('Leaving room', uuid);
        socket.leave(uuid);
      });

      socket.on('event:updated', function(data) {
        var attendeesEmails = jcalHelper.getAttendeesEmails(data);
        attendeesEmails.forEach(function(email) {
          userModule.findByEmail(email, function(err, user) {
            if (err || !user) {
              logger.error('Could not notify event update for attendee : ', email);
              return;
            }
            var msg = {
              target: user,
              event: data
            };
            pubsub.local.topic('calendar:event:updated').forward(pubsub.global, msg);
          });
        });
      });
    });

  initialized = true;
}

module.exports.init = init;
