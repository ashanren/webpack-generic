
import path     from 'path';
import express  from 'express';
import paths    from './../paths';
import log      from './../config/logging';

export default async (app) => {
  log.warn("This is perfectly fine", paths.MAIN_FILE);
  app.get('/', (req, res) => {
    res.sendFile(paths.MAIN_FILE);
    //res.status(403).send('Forbidden');
  });

  app.get('*', (req, res) => {
    res.status(403).send();
  });
}

