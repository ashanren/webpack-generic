
import path     from 'path';
import paths    from './paths';
import express  from 'express';
import routes   from './app/routes';
import log      from './config/logging';

const app = express();
log.info(paths.DIST_DIR);
routes(app);
//routes
//app.use(routes(app));
//require('./app/routes')(app);
app.listen(8001, () => {
  log.info("App Listening");
});


