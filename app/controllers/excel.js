
/*
 *@file excel.js
 *@author Jarel Pellew
 *@desc Handler for generating excel sheets
 */

const excel = require('exceljs');
const log   = require('./../../config/logging');

exports.testExcel = async (req, res) => {
  try {
    log.info("Testing New Stuff");
    const workbook  = new excel.Workbook();
    workbook.creator = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('text Sheet');
    sheet.columns = [
      {header: 'Id', key: 'id'},
      {header: 'Name', key: 'name'},
    ];

    sheet.addRows([
      {id: 1, name: "John Doe"},
      {id: 2, name: "Jane Mary"},

    ]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment; filename=" + "Report.xlsx");
    await workbook.xlsx.write(res);
    log.debug('Finished writing excel sheet');
    return res.end();
    //res.send("Hilo");
  } catch (err) {
    log.error("Error Creating Excel:", err);
    res.status(402).json(err);
  }
}

exports.studentExcel = async (req, res) => {
  try {
    log.info("Hilo");
  } catch (err) {
  }
}
