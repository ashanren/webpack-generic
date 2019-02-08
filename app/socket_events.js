
/*
 *@file socket_events.js
 *@author Jarel Pellew
 *@desc Socket Calls
 */
const log       = require("./../config/logging");
const User      = require("./models/users");
const admin     = require("./controllers/admins");
const school    = require("./controllers/schools");
const service   = require('./services/socket_service');
const therapist = require("./controllers/therapists");

//On Socket Connection
module.exports = async (socket) => {
  const addr  = socket.handshake.address;
  log.info(`Socket Connected to ${addr}`);
  const user = socket.request.session.passport && socket.request.session.passport.user;
  log.info("User ", user);

  if (!user) {
    log.error("Unauthorized User/Bug in code", addr);
    service.send('get_user', user, socket.id);
    return socket.disconnect();
  }

  service.send('get_user', user, socket.id);
  if (user.user_types_id === 1) {
    socket.join('admin');
  } else if (user.user_types_id === 2) {
    //Join Some kind of Room for Therapists
  } else {
    //Join Some kind of Room for Schools
  }
  //service.emit('get_user', user);
  /*
  let info = "";
  switch (user.user_types_id) {
    case 1:
      const admin = await Admin.query().select('admin_types_id', 'first_name', 'last_name').where({user_id: user.id}).first();
      log.info("Admin", admin);
      user = {...user, admin};
      break;
    case 2:
      const therapist = await Therapist.query().select('therapist_types_id', 'first_name', 'last_name').where({user_id: user.id}).first();
      log.info("Therapist", therapist);
      user = {...user, therapist};
      break
    case 3:
      const school  = await School.query().select('name').where({user_id: user.id}).first();
      break;
  }
  */


  /*
   * @name disconnect
   * @desc User Disconnecting from socket.
   */
  socket.on('disconnect', () => {
    log.info(addr, "Disconnected from Socket Server");
  });

  socket.on('new_admin', (admin) => {
    log.info(admin, "Received Admin!");
  });

};

