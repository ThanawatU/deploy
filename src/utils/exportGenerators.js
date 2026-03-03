const fs = require('fs');
const path = require('path');
const { format } = require('@fast-csv/format');
const PDFDocument = require('pdfkit');
const { toISO } = require('./timestamp');

/**
 * Export Generators
 * 
 * สร้างไฟล์ export ในรูปแบบ CSV, JSON, PDF จากข้อมูล log
 */

/** คอลัมน์มาตรฐานตาม log type */
const LOG_COLUMNS = {
  AuditLog: {
    headers: ['ID', 'Timestamp', 'User ID', 'Role', 'Action', 'Entity', 'Entity ID', 'IP Address', 'User Agent'],
    fields: ['id', 'createdAt', 'userId', 'role', 'action', 'entity', 'entityId', 'ipAddress', 'userAgent']
  },
  SystemLog: {
    headers: ['ID', 'Timestamp', 'Level', 'Method', 'Path', 'Status Code', 'Duration (ms)', 'User ID', 'IP Address', 'Request ID'],
    fields: ['id', 'createdAt', 'level', 'method', 'path', 'statusCode', 'duration', 'userId', 'ipAddress', 'requestId']
  },
  AccessLog: {
    headers: ['ID', 'Timestamp', 'User ID', 'Login Time', 'Logout Time', 'IP Address', 'User Agent', 'Session ID'],
    fields: ['id', 'createdAt', 'userId', 'loginTime', 'logoutTime', 'ipAddress', 'userAgent', 'sessionId']
  }
};

/**
 * แปลงค่า field เป็น string สำหรับ export
 * @param {*} value
 * @returns {string}
 */
const formatValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return toISO(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * สร้างไฟล์ CSV จากข้อมูล log
 * 
 * @param {Array} records - ข้อมูล log
 * @param {string} logType - ชนิด log ("AuditLog" | "SystemLog" | "AccessLog")
 * @param {string} filePath - path ไฟล์ที่จะสร้าง
 * @returns {Promise<{ fileSize: number, recordCount: number }>}
 */
const generateCSV = (records, logType, filePath) => {
  return new Promise((resolve, reject) => {
    const columns = LOG_COLUMNS[logType];
    if (!columns) {
      return reject(new Error(`Unknown log type: ${logType}`));
    }

    const writeStream = fs.createWriteStream(filePath);
    const csvStream = format({ headers: columns.headers });

    csvStream.pipe(writeStream);

    for (const record of records) {
      const row = columns.fields.map(field => formatValue(record[field]));
      csvStream.write(row);
    }

    csvStream.end();

    writeStream.on('finish', () => {
      const stats = fs.statSync(filePath);
      resolve({ fileSize: stats.size, recordCount: records.length });
    });

    writeStream.on('error', reject);
    csvStream.on('error', reject);
  });
};

/**
 * สร้างไฟล์ JSON จากข้อมูล log
 * 
 * @param {Array} records - ข้อมูล log
 * @param {string} logType - ชนิด log
 * @param {string} filePath - path ไฟล์ที่จะสร้าง
 * @returns {Promise<{ fileSize: number, recordCount: number }>}
 */
const generateJSON = async (records, logType, filePath) => {
  const columns = LOG_COLUMNS[logType];
  if (!columns) {
    throw new Error(`Unknown log type: ${logType}`);
  }

  const exportData = {
    exportedAt: toISO(),
    logType,
    recordCount: records.length,
    fields: columns.fields,
    records: records.map(record => {
      const obj = {};
      for (const field of columns.fields) {
        obj[field] = record[field] ?? null;
      }
      return obj;
    })
  };

  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  const stats = fs.statSync(filePath);
  return { fileSize: stats.size, recordCount: records.length };
};

/**
 * สร้างไฟล์ PDF จากข้อมูล log
 * 
 * @param {Array} records - ข้อมูล log
 * @param {string} logType - ชนิด log
 * @param {string} filePath - path ไฟล์ที่จะสร้าง
 * @returns {Promise<{ fileSize: number, recordCount: number }>}
 */
const generatePDF = (records, logType, filePath) => {
  return new Promise((resolve, reject) => {
    const columns = LOG_COLUMNS[logType];
    if (!columns) {
      return reject(new Error(`Unknown log type: ${logType}`));
    }

    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'landscape',
      margin: 30
    });

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Title
    doc.fontSize(16).text(`${logType} Export Report`, { align: 'center' });
    doc.fontSize(10).text(`Exported at: ${toISO()}`, { align: 'center' });
    doc.fontSize(10).text(`Total records: ${records.length}`, { align: 'center' });
    doc.moveDown(1);

    // Table config — select subset of columns that fit on landscape A4
    const maxCols = 7;
    const displayHeaders = columns.headers.slice(0, maxCols);
    const displayFields = columns.fields.slice(0, maxCols);
    const tableLeft = 30;
    const pageWidth = doc.page.width - 60;
    const colWidth = Math.floor(pageWidth / displayHeaders.length);
    const rowHeight = 20;

    // Table header
    const drawTableHeader = (y) => {
      doc.fontSize(8).font('Helvetica-Bold');
      displayHeaders.forEach((header, i) => {
        doc.text(header, tableLeft + (i * colWidth), y, {
          width: colWidth - 4,
          lineBreak: false
        });
      });
      doc.font('Helvetica');
      return y + rowHeight;
    };

    let currentY = drawTableHeader(doc.y);

    // Table rows
    doc.fontSize(7);
    for (const record of records) {
      // Page break check
      if (currentY + rowHeight > doc.page.height - 40) {
        doc.addPage();
        currentY = drawTableHeader(30);
        doc.fontSize(7);
      }

      displayFields.forEach((field, i) => {
        const value = formatValue(record[field]);
        const displayValue = value.length > 30 ? value.substring(0, 27) + '...' : value;
        doc.text(displayValue, tableLeft + (i * colWidth), currentY, {
          width: colWidth - 4,
          lineBreak: false
        });
      });

      currentY += rowHeight;
    }

    doc.end();

    writeStream.on('finish', () => {
      const stats = fs.statSync(filePath);
      resolve({ fileSize: stats.size, recordCount: records.length });
    });

    writeStream.on('error', reject);
  });
};

module.exports = {
  generateCSV,
  generateJSON,
  generatePDF,
  LOG_COLUMNS
};
