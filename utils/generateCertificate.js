const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

module.exports = async (studentId, course) => {
  // ensure folder
  const outDir = path.join(__dirname, '..', 'certs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const student = await User.findById(studentId);
  const fileName = `certificate_${studentId}_${course._id}.pdf`;
  const filePath = path.join(outDir, fileName);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Simple nice certificate layout
  doc.fontSize(40).text('Certificate of Completion', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(24).text(`${student.name}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(18).text(`Has successfully completed the course`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(22).text(`${course.title}`, { align: 'center', underline: true });
  doc.moveDown(1.5);
  doc.fontSize(14).text(`Issued: ${new Date().toLocaleDateString()}`, { align: 'center' });

  doc.end();

  // return promise that resolves when file is written
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};
