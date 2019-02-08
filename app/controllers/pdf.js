
/*
 *@file pdf.js
 *@author Jarel Pellew
 *@desc Handler for Admin asyncs on backend
 */

//const pdfmake   = require('pdfmake');
const log     = require('./../../config/logging');
const PDFDoc  = require('pdfkit');
const ClientLog = require('./../models/clientlogs');
const Client = require('./../models/clients');
const Therapist = require('./../models/therapists');

const { raw, transaction } = require('objection');

exports.studentsPDF = async (req, res) => {
  try {
    const doc = new PDFDoc({margin: {left: 15, top: 25, right: 15, }});
    let filename = "Student_Doc.pdf";
    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');
    doc.image(`${__dirname}/../../images/TalkPath_Logo.png`, 320, 22, {width: 240});
    let nameString = "               ";
    let dateString1 = "    ";
    let dateString2 = "    ";
    let dateString3 = "    ";
    let locationString = "            ";
    let dobString1 = "    ";
    let dobString2 = "    ";
    let dobString3 = "    ";
    let durationString = "    ";
    let timeInString = "    ";
    let timeOutString = "    ";
    let providerNameString = "              ";
    let providerTitleString = "              ";
    let serviceCodeString = "                       ";
    let iepDateString1 = "    ";
    let iepDateString2 = "    ";
    let iepDateString3 = "    ";
    let serviceHoursString = "                       ";
    let helperNameString = "               ";
    let iepGoalString = "                               ";
    let presentYesBox = "[]";
    let presentNoBox = "[]";
    let roleBox = "[]";
    let observingBox = "[]";
    let assistedBox = "[]";
    let iepGoalsString = "                          ";
    let iepProgressString = "                   ";
    let makeupYesBox = "[]";
    let makeupNoBox = "[]";
    let groupBox = "[]";
    let individualBox = "[]";
    let notesString = "                ";
    let geographicBox = "[]";
    let physicalBox = "[]";
    let socialBox = "[]";
    let limitedBox = "[]";
    let otherString = "      ";
    let lastX = doc.x;
    let lastY = doc.y;
    doc.font("Times-Bold").fontSize(20).fillColor("#23a4b5").text("Student Session Note", doc.x, lastY + 15);
    doc.fontSize(16);
    doc.fillColor("black").text("Name: ", doc.x, doc.y, {continued: true});
    doc.text('"' + nameString + '"', doc.x, doc.y, {continued: true, underline: true});
    doc.text(" Date: ", doc.x, doc.y, {continued: true, underline: false});
    doc.text(dateString1 + "/" + dateString2 + "/" + dateString3, doc.x, doc.y, {continued: true, underline: true});
    doc.text(" Location: ", doc.x, doc.y, {continued: true, underline: false});
    doc.text(locationString, doc.x, doc.y, {underline: true});
    doc.text("DOB: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(dobString1 + "/" + dobString2 + "/" + dobString3, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Session Duration: ", doc.x, doc.y, {continued: true, underline: false});
    doc.text(durationString, doc.x, doc.y, {continued: true, underline: true});
    doc.text(" Time In: ", doc.x, doc.y, {continued: true, underline: false});
    doc.text(timeInString, doc.x, doc.y, {continued: true, underline: true});
    doc.text(" Time Out: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(timeOutString, doc.x, doc.y, {underline: true});
    doc.text(" Service Provider Name: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(providerNameString, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Title: ", doc.x, doc.y, {continued: true, underline: false});
    doc.text(providerTitleString, doc.x, doc.y, {underline: true});
    doc.text("Fill in Applicable Sections Below:", doc.x, doc.y, {underline: true});
    doc.text("Service Code: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(serviceCodeString, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" IEP/ARD Date: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(iepDateString1 + "/" + iepDateString2 + "/" + iepDateString3, doc.x, doc.y, {underline: true});
    doc.text("Number of Service Hours Required Per Week: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(serviceHoursString, doc.x, doc.y, {underline: true});
    doc.text("eHelper (Fill in all that apply)", doc.x, doc.y, {underline: false, continued: false});
    doc.text("Name: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(helperNameString, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Present: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(presentYesBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Yes ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(presentNoBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" No", doc.x, doc.y, {underline: false, continued: false});
    doc.text("Role: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(observingBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Only Observing ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(assistedBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Actively Assited", doc.x, doc.y, {underline: false, continued: false});
    doc.text("Therapy/Related Service Notes:", doc.x, doc.y, {underline: true, continued: false});
    doc.text("IEP Goal(s) Worked On:", doc.x, doc.y, {underline: false, continued: false});
    doc.text(iepGoalsString, doc.x, doc.y, {underline: true, continued: false});
    doc.text("IEP Progress:", doc.x, doc.y, {underline: false, continued: false});
    doc.text(iepProgressString, doc.x, doc.y, {underline: true, continued: false});
    doc.text("Make-Up Session: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(makeupYesBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Yes ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(makeupNoBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" No ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(" Session Type: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(groupBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Group ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(individualBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Individual", doc.x, doc.y, {underline: false, continued: false});
    doc.text("Tx Notes:", doc.x, doc.y, {underline: false, continued: false});
    doc.text(notesString, doc.x, doc.y, {underline: true, continued: false});
    doc.text("Reason for TelePractice (Check One): ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(barrierBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Geograhic Barrier ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(physicalBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Physical Limitations ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(socialBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Social Limitations ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(staffingBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Limited Staffing ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(otherBox, doc.x, doc.y, {underline: true, continued: true});
    doc.text(" Other: ", doc.x, doc.y, {underline: false, continued: true});
    doc.text(otherString, doc.x, doc.y, {underline: true, continued: false});
    doc.text("Service Provider Signature:", doc.x, doc.y, {underline: false, continued: true});
    
    doc.pipe(res);
    doc.end();
  } catch (err) {
    log.error(err);
  }
}

exports.clientsPDF = async (req, res) => {
  try {

    let logsIDs = req.params.ids.split(",");

    for(let logID of logsIDs) {
      const doc = new PDFDoc({margin: {left: 15, top: 25, right: 15, }});

      let client_log = await ClientLog.query().select('*').where('id', logID);
      client_log = client_log[0];
      let client = await Client.query().select('*').where('id', client_log.clients_id);
      client = client[0];
      let therapist = await Therapist.query().select('*').where('id', client_log.therapists_id);
      therapist = therapist[0];
      

      let filename = "Student_Doc.pdf";
      res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
      res.setHeader('Content-type', 'application/pdf');
      doc.image(`${__dirname}/../../images/TalkPath_Logo.png`, 320, 22, {width: 240});
      console.log(client_log);
      console.log(client);
      console.log(therapist);
      let nameString = client["first_name"] + " " + client["last_name"];
      let dateString1 = "    ";
      let dateString2 = "    ";
      let dateString3 = "    ";
      let timeInString = "          ";
      let timeOutString = "          ";
      let locationString = "            ";
      let goalString = client_log["iep_goal"];
      let noteString = client_log["note"];
      let signatureString = "                                                      ";    
      let signatureImg = "Test2.png";
      let acceptableBox = "[]";
      let delaysBox = "[]";
      let minimalBox = "[]";
      let moderateBox = "[]";
      let unacceptableBox = "[]";
      let helperString = client_log["e_helper"];
      let observingBox = client_log["e_helper_role"] === 1 ? "[x]" : "[]";
      let assistingBox = client_log["e_helper_role"] === 2 ? "[x]" : "[]";
      let groupBox = client_log["is_individual"] == 1 ? "[]" : "[x]";
      let individualBox = client_log["is_individual"] == 1 ? "[x]" : "[]";

      let lastX = doc.x;
      let lastY = doc.y;
      doc.rect(15, doc.y, doc.page.width - 30, 40).fillAndStroke("#46b453", "#46b453");
      doc.fontSize(16);
      doc.font("Times-Bold").fillColor("white").text("Session Note", doc.x, lastY + 15);
      doc.moveDown();
      doc.rect(15, doc.y, doc.page.width - 30, 250).fillAndStroke("#d1eef7", "#d1eef7");
      for(let i = 0; i < 1; i++) {
        doc.moveDown();
      }
      lastX = doc.x;
      lastY = doc.y;
      doc.font("Times-Roman").fillColor("black").text("NAME: ", 20, doc.y, {continued: true});
      doc.text(nameString, doc.x, doc.y, {underline: true, continued:  true});
      doc.text("     DATE: ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(dateString1 + "/" + dateString2 + "/" + dateString3, doc.x, doc.y, {underline: true});
      doc.moveDown();
      doc.text("TIME IN: ", doc.x, doc.y, {continued: true});
      doc.text(timeInString, doc.x, doc.y, {underline: true, continued: true});
      doc.text("  TIME OUT: ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(timeOutString, doc.x, doc.y, {underline: true, continued: true});
      doc.text("  LOCATION: ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(locationString, doc.x, doc.y, {underline: true});
      doc.moveDown();
      doc.text("VIDEO/AUDIO QUALITY: ", doc.x, doc.y, {underline: false});
      doc.moveDown();
      doc.text(acceptableBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Acceptable ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(delaysBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Minor delays/No disruption ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(minimalBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Minimal interruptions ", doc.x, doc.y, {underline: false});
      doc.moveDown();
      doc.text(moderateBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Moderate/Some interruptions ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(unacceptableBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Unacceptable ", doc.x, doc.y, {underline: false});
      doc.moveDown();
      doc.text("eHelper ", doc.x, doc.y, {continued: true});
      doc.text(helperString, doc.x, doc.y, {underline: true, continued: true});
      doc.text(observingBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Observing ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(assistingBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Actively Assisting", doc.x, doc.y, {underline: false});
      doc.moveDown();
      doc.text("Session Type: ", doc.x, doc.y, {continued: true});
      doc.text(groupBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Group ", doc.x, doc.y, {continued: true, underline: false});
      doc.text(individualBox, doc.x, doc.y, {underline: true, continued: true});
      doc.text(" Individual", doc.x, doc.y, {underline: false});
      for(let i = 0; i < 1; i++) {
        doc.moveDown();
      }
      doc.fillColor("#14b8e1").text("Goal:");
      doc.rect(15, doc.y, doc.page.width - 30, 80).fillAndStroke("#ffffff", "#000000");
      lastX =doc.x;
      lastY = doc.y + 80;
      doc.fillColor("#000000").text(goalString, doc.x, doc.y, {underline: true});
      doc.fillColor("#14b8e1").text("TX Note: ", lastX, lastY + 10);
      doc.rect(15, doc.y, doc.page.width - 30, 80).fillAndStroke("#ffffff", "#000000");
      doc.fillColor("#000000").text(noteString, doc.x, doc.y, {underline: true});
      doc.text("Speech-Language Pathologist", doc.x, doc.y, {underline: false});
      doc.text("855-274-9582", doc.x, doc.y, {underline: false, continued: true});
      doc.text("   talkpathlive.com");
      doc.pipe(res);
      doc.end();
    }
  } catch (err) {
    log.error(err);
  }
}

generateInvoiceHeaderRow = async (doc, headers) => {
  for(let header of headers) {
    if(headers.indexOf(header) < headers.length - 1) {
      doc.text(header, doc.x, doc.y, {continued: true});
      doc.x += 10;
    } else {
      doc.text(header, doc.x, doc.y, {continued: false});
    }
  }
}

generateInvoiceRow = async (doc, client_log) => {
      let client = await Client.query().select("*").where("id", client_log["clients_id"]);
      client = client[0];
      let individualString = client_log["is_individual"] ? "Individual" : "Group";
      let totalTime = parseInt(client_log["time"]) + parseInt(client_log["doc_time"])
      let hours = totalTime/60
      let totalCost = parseFloat(client_log["cost"]) * hours
      totalCost = totalCost.toFixed(2);
      
      console.log(client_log);
      doc.text(client_log["date"].split(" ")[0], doc.x, doc.y, {continued: true});
      doc.x += 10;
      doc.text("Org", doc.x, doc.y, {continued: true});
      doc.x += 10;
      doc.text(client["first_name"] + " " + client["last_name"], doc.x, doc.y, {continued: true});
      doc.x += 10;
      doc.text(individualString, doc.x, doc.y, {continued: true});
      doc.x += 10;
      doc.text("Session", doc.x, doc.y, {continued: true});
      doc.x += 10;
      doc.text("$" + parseFloat(client_log["cost"]).toFixed(2), doc.x, doc.y, {continued: true});
      doc.x += 10;
      doc.text(totalTime, doc.x, doc.y, {continued: true});
      doc.x += 10;
      doc.text("$" + totalCost, doc.x, doc.y, {continued: false});
      return totalCost
}

exports.invoicesPDF = async (req, res) => {
  try {

    let therapistIDs = req.params.ids.split(",");
    for(let therapists_id of therapistIDs) {
      const doc = new PDFDoc({layout: "landscape", margin: {left: 15, top: 25, right: 15, }});

      let startDate = "2018/01/01";
      let endDate = "2019/02/02";

      result = {};

      let client_logs = await ClientLog.query().select('*').where('therapists_id', therapists_id).orderBy("date");
      let therapist = await Therapist.query().select('*').where('id', therapists_id);
      therapist = therapist[0];

      let filename = "Unofficial_Invoice.pdf";
      res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
      res.setHeader('Content-type', 'application/pdf');
      let titleString = "UNOFFICIAL INVOICE";
      let nameString = therapist["first_name"] + " " + therapist["last_name"];
      let companyString = "Bob's Pickles";                                                       
      let addressString = "50 Wallington Way";
      let cityString = "Hartford";
      let stateString = "CT"; 
      let zipString = "07321";
      let phoneString = "[866 654 8291]";
      let emailString = therapist["email"];
      let serviceString = "Speech Therapy";
      let invoiceTotal = 0;
      let hoursTotal = 0;

      doc.fontSize(18);
      doc.fillColor("red").font("Times-Roman").text(titleString, doc.x, doc.y, {align: "center"});
      doc.moveDown();
      doc.moveDown();
      doc.fontSize(10);
      doc.font("Times-Roman").text(nameString);
      doc.font("Times-Roman").text(companyString);
      doc.font("Times-Roman").text(addressString);
      let lastX = doc.x;
      let lastY = doc.y;
      doc.font("Times-Roman").text(cityString + "," + stateString + "," + zipString);
      doc.font("Times-Roman").text(phoneString);
      doc.font("Times-Roman").text(emailString);
      for(let i = 0; i < 4; i++) {
        doc.moveDown();
      }
      doc.fillColor("black").font("Times-Roman").text("TalkPath Live");
      doc.font("Times-Roman").text("P.O. Box 338");
      doc.font("Times-Roman").text("Williamstown, NJ 08094");
      doc.y -= 160;
      doc.fillColor("red").text("Invoice No: Please Increment", 520, lastY);
      doc.text("Invoice Period:");
      doc.text(startDate.toString() + " - " + endDate.toString());
      for(let i = 0; i < 6; i++) {
        doc.moveDown();
      }
      doc.text("Related Service: ", 520, doc.y, {continued: true});
      doc.text('   ' + serviceString, doc.x, doc.y, {continued: false});
      for(let i = 0; i < 2; i++) {
        doc.moveDown();
      }
      doc.fillColor("black").text("", lastX, doc.y);
      headers = ["Date", "Org or District", "Client Name", "Individual or Group", "Service Type", "Rate (per hour)", "Time (minutes)", "Total Owed"];
      await generateInvoiceHeaderRow(doc, headers);
      let grandTotalCost = 0
      for(let log of client_logs) {
        let cost = await generateInvoiceRow(doc, log);
        grandTotalCost += parseFloat(cost)
      }
      doc.moveDown();
      doc.font("Times-Bold").text("Invoice Total      $" + grandTotalCost.toFixed(2), doc.x, doc.y, {continued: false});
      doc.pipe(res);
      doc.end();
    }
  } catch (err) {
    log.error(err);
  }
}

