
const fs      = require('fs');
const path    = require('path');
const promise = require('util').promisify;
const log     = require('./../../config/logging');
//File System Methods Promisified
const lstat   = promise(fs.lstat);
const mkdir   = promise(fs.mkdir);
const access  = promise(fs.access);
const rmdir   = promise(fs.rmdir);
const unlink  = promise(fs.unlink);
const readdir = promise(fs.readdir);


const makeDir   = async (dir) => {
  try {
    const exist = await exists(dir);
    if (exist) {
      log.info("Apparently it is a dirrectory");
      return 1;
    }
    const res = await mkdir(dir);
    return 0;
  } catch (err) {
    log.error(`Unable to Make Dir ${dir}`);
    log.error(err);
    return 1;
  }
}
const removeDir = async (dir) => {
  try {
    const files = await readdir(dir);
    await Promise.all(files.map(async (file) => {
      try {
        const p     = path.join(dir, file);
        const stat  = await lstat(p);
        if (stat.isDirectory()) {
          await removeDir(p);
          return;
        }
        await unlink(p);
        return;
      } catch (err) {
        log.error("Error occurred when handling");
      }
    }));
    await rmdir(dir);
    return;
  } catch (err) {
    log.error(`Unable to Remove Dir ${dir}`);
    log.error(err);
  }
}

const removeFile = async (file) => {
  try {
    const exist = await exists(path.resolve(file));
    if (exist) {
      await unlink(file);
    }
    return true;
  } catch (err) {
    log.error(`Unable to Remove File ${file}`);
    log.error(err);
    return false;
  }
}

const exists = async (p) => {
  try {
    const stat  = await lstat(p);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports  = {
  exists    : exists,
  makeDir   : makeDir,
  removeDir : removeDir,
  removeFile : removeFile,
};

