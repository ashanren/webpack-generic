
const { raw, transaction } = require('objection');
const LocalStrategy	= require('passport-local').Strategy;
//custom modules
const log           = require('./logging');
const User          = require('./../app/models/users');
const Admin         = require('./../app/models/admins');
const School        = require('./../app/models/schools');
const Therapist     = require('./../app/models/therapists');

module.exports = function(passport) {
	passport.serializeUser((user, done) => {
    log.info("SERIALIZING USER: ", user);
		done(null, user);
	});

	passport.deserializeUser((id, done) => {
    done("", id);
	});

	passport.use('login', new LocalStrategy ({
		passReqToCallBack	: true,	
		usernameField		  : 'username',
		passwordField		  : 'password',
		passReqToCallback	: true
	},
	async (req, username, password, done) => {
    try {
      let start = new Date().getTime();
      let user  = await User.query().select('users.*', 'type.type').joinRelation('type')
        .where({username: username})
        .first();
      log.info("Query Time:", new Date().getTime() - start, "ms");
      //log.info('USER PULLED', user);
      if (!user) {//Incorrect Username
				log.error("User: ", username, " is not in the system");
				return done(null, false,{ err: "You have entered an Incorrect Username" });
      }
      if (!user.isValidPassword(password)) {//Incorrect Password
				log.error("Invalid Password for user:", username);
				return done(null, false, { err: 'You have entered an Incorrect Password' });
			}
      switch (user.user_types_id) {
        case 1:
          const admin = await Admin.query().select('id as real_id', 'admin_types_id', raw("CONCAT(first_name, ' ', last_name) as name")).where({user_id: user.id}).first();
          log.info("Admin", admin);
          user = {...user, ...admin};
          break;
        case 2:
          const therapist = await Therapist.query().select('id as real_id', 'bill_per_hour_schools as school_bill', 'bill_per_hour_clients as client_bill', 'therapist_types_id', raw("CONCAT(first_name, ' ', last_name) as name")).where({user_id: user.id}).first();
          log.info("Therapist", therapist);
          user = {...user, ...therapist};
          break
        case 3:
          const school  = await School.query().select('id as real_id', 'name').where({user_id: user.id}).first();
          user = {...user, ...school};
          break;
      }
			return done(null, user, { message: 'Logging in ' });
    } catch (err) {
      log.error("Error", err);
      log.error(err);
      done(err);
    }
	}));
};

