
const log = require('./../../config/logging');
let socket;
let server;
//Sockets functions
module.exports  = {
  init: (app, port, session) => {
    server  = require('http').createServer(app);
    socket  = require('socket.io')(server).use((io, next) => {session(io.request, {}, next)});
    server.listen(port);
    log.info(`Socket Server Started - Listening on port: ${port}`);
  },
  on: (e, func) => {
    log.trace("Listening for Event:", e);
    socket.on(e, func);
  },
  emit: (e, data, func) => {
    log.trace("Emitting this event to everyone:", e, ":", data);
    socket.emit(e, data, func);
  },
  broadcast: (e, data) => {
    log.trace("Broadcasting Event:", e);
    socket.sockets.emit(event, data);
  },
  send: (e, data, id) => {
    log.trace("Sending Event:", e);
    socket.to(id).emit(e, data);
  },
  getSocket: () => {
    return socket;
  },
  getServer: () => {
    return server;
  }
};

