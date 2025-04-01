const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');


async function generatePdf(petId, recordId) {
    try {
        console.log("Generating PDF for pet ID:", petId);
    
        // First, fetch the pet data to get the record date
        const dateQuery = `
            SELECT p.pet_id, p.pet_name, r.record_date
            FROM pet_info p
            LEFT JOIN record_info r ON p.pet_id = r.pet_id
            WHERE p.pet_id = ?
            ORDER BY r.record_date DESC
            LIMIT 1
        `;
    
        const [initialData] = await db.query(dateQuery, [petId]);
        const pData = initialData.length > 0 ? initialData[0] : null;
    
        if (!pData) {
            console.error("No pet record found for ID:", petId);
            throw new Error("Pet record not found");
        }
    
        // Format the date for the filename (YYYY-MM-DD format works well for filenames)
        const recordDate = pData.record_date ? new Date(pData.record_date) : new Date();
        // Format the date manually to avoid timezone issues
        const year = recordDate.getFullYear();
        const month = String(recordDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(recordDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        // Create the base filename using pet name and date
        const baseFilename = `${pData.pet_name}_Medical_Record_${formattedDate}`;
        const sanitizedFilename = baseFilename.replace(/[^a-z0-9_-]/gi, '_'); // Sanitize for safe filenames
        
        const baseDir = path.join(__dirname, '../generated_pdfs');
        
        // Ensure the directory exists
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        
        // Find a unique filename
        let counter = 0;
        let finalFilename = `${sanitizedFilename}.pdf`;
        let pdfPath = path.join(baseDir, finalFilename);
        
        while (fs.existsSync(pdfPath)) {
            counter++;
            finalFilename = `${sanitizedFilename} (${counter}).pdf`;
            pdfPath = path.join(baseDir, finalFilename);
        }
        
        console.log("Saving PDF to:", pdfPath);
    
        // Create a new PDF document with appropriate margins
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4',
            autoFirstPage: true
        });
        
        // Rest of your PDF generation code remains the same...
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        console.log("Fetching pet details for pet_id:", petId);
        const petQuery = `
            SELECT p.pet_id, p.pet_name, p.pet_breed, p.pet_birthday, p.pet_age_year, p.pet_age_month, 
                p.pet_gender, p.pet_color, p.pet_vitality, p.pet_status,
                ps.spec_description AS species,
                o.owner_address, o.owner_alt_person1, o.owner_alt_contact1, o.owner_alt_person2, o.owner_alt_contact2,
                u.user_firstname, u.user_lastname, u.user_email, u.user_contact,
                r.record_date, r.record_condition, r.record_symptom, r.record_temp, r.record_weight, 
                r.record_recent_visit, r.record_purpose, r.record_purchase, r.record_lab_file,
                s.surgery_type, s.surgery_date, s.surgery_id,
                d.diagnosis_text,
                l.lab_description, 
                vi.vax_type AS vaccine_type, v.imm_rec_date AS vaccine_date, v.imm_rec_quantity AS vaccine_doses
            FROM pet_info p
            JOIN users u ON p.user_id = u.user_id
            JOIN owner o ON u.user_id = o.user_id
            LEFT JOIN match_pet_species mps ON p.pet_id = mps.pet_id
            LEFT JOIN pet_species ps ON mps.spec_id = ps.spec_id
            LEFT JOIN record_info r ON p.pet_id = r.pet_id
            LEFT JOIN surgery_info s ON r.surgery_id = s.surgery_id
            LEFT JOIN diagnosis d ON r.diagnosis_id = d.diagnosis_id
            LEFT JOIN match_rec_lab mrl ON r.record_id = mrl.record_id
            LEFT JOIN lab_info l ON mrl.lab_id = l.lab_id
            LEFT JOIN immunization_record v ON p.pet_id = v.pet_id
            LEFT JOIN vax_info vi ON v.vax_id = vi.vax_id
            WHERE p.pet_id = ? AND r.record_id = ?
        `;

        const [rows] = await db.query(petQuery, [petId, recordId]);
        console.log("Raw Query Result:", rows);

        const petData = rows.length > 0 ? rows[0] : null;

        console.log("DEBUG: record_lab_file type:", typeof petData.record_lab_file);
        console.log("DEBUG: record_lab_file content:", petData.record_lab_file);

        if (!petData) {
            console.error("No pet record found for ID:", petId);
            throw new Error("Pet record not found");
        }
        console.log("Pet data retrieved:", petData);


        // Get unique vaccine records
        const vaccineRecords = rows.filter(row => row.vaccine_type).reduce((acc, row) => {
            if (!acc.some(v => v.vaccine_type === row.vaccine_type)) {
                acc.push({
                    vaccine_type: row.vaccine_type,
                    vaccine_date: row.vaccine_date ? new Date(row.vaccine_date).toLocaleDateString() : 'N/A',
                    vaccine_doses: row.vaccine_doses || 'N/A'
                });
            }
            return acc;
        }, []);

        // Page layout parameters
        const leftColumnX = 50;
        const rightColumnX = 300;
        const labelWidth = 120; // Increased label width for proper alignment
        const pageWidth = doc.page.width - 100; // Total usable width accounting for margins
        const centerX = doc.page.width / 2;
        const contentWidth = doc.page.width - 100; // Total width minus margins

        // Function to add a consistent header across all pages
        function addHeader(doc) {
            const logoPath = path.join(__dirname, '../assets/clinic_logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 35, { width: 50 }); // Updated Y position to align with text
            }

            // Set up fonts - making sure we have a bold font available
            doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

            doc.font('Helvetica-Bold').fontSize(16).text('Kho Veterinary Clinic', 110, 50)
            .font('Helvetica').fontSize(10).text('715 Earnshaw St., Sampaloc, Manila, 1008 Metro Manila', 110, 70);
            
            doc.moveDown(3);
        }

        // Add header to the first page
        addHeader(doc);

        // Title section - centered properly with specified width
        doc.font('Helvetica-Bold').fontSize(16)
        .text('MEDICAL RECORD', 50, doc.y, { align: 'center', width: contentWidth })
        .moveDown(0.5)
        .font('Helvetica').fontSize(10)
        .text(`Date of Record: ${petData.record_date ? new Date(petData.record_date).toLocaleDateString() : 'N/A'}`, 50, doc.y, { align: 'center', width: contentWidth })
        .moveDown();

        // Helper function for text with consistent label formatting
        const addLabeledText = (label, value, x, y, options = {}) => {
            doc.font('Helvetica-Bold').fontSize(10)
            .text(`${label}:`, x, y, { ...options, continued: true });
            
            doc.font('Helvetica').fontSize(10)
            .text(` ${value || 'N/A'}`);
            
            return doc.y;
        };

        // Helper function for section headers - ensuring left alignment
        const addSectionHeader = (text) => {
            doc.font('Helvetica-Bold').fontSize(14).text(text, leftColumnX, doc.y, { align: 'left' });
            doc.moveDown(0.5);
            
            // Draw a line to separate header from content
            doc.moveTo(leftColumnX, doc.y).lineTo(leftColumnX + pageWidth, doc.y).stroke();
            doc.moveDown(0.5);
        };

        // Pet Profile section with left-aligned header
        addSectionHeader('Pet Profile');
        
        let leftY = doc.y;
        let rightY = doc.y;
        
        // Left column items - keeping labels on left
        leftY = addLabeledText('ID', petData.pet_id, leftColumnX, leftY);
        leftY = addLabeledText('Name', petData.pet_name, leftColumnX, leftY + 5);
        leftY = addLabeledText('Species', petData.species, leftColumnX, leftY + 5);
        leftY = addLabeledText('Breed', petData.pet_breed, leftColumnX, leftY + 5);
        leftY = addLabeledText('Gender', petData.pet_gender, leftColumnX, leftY + 5);
        
        // Right column items - keeping labels on left of column
        rightY = addLabeledText('Birthday', petData.pet_birthday ? new Date(petData.pet_birthday).toLocaleDateString() : 'N/A', rightColumnX, rightY);
        rightY = addLabeledText('Age', `${petData.pet_age_year || '0'} years, ${petData.pet_age_month || '0'} months`, rightColumnX, rightY + 5);
        rightY = addLabeledText('Color', petData.pet_color, rightColumnX, rightY + 5);
        rightY = addLabeledText('Status', petData.pet_vitality ? 'Alive' : 'Dead', rightColumnX, rightY + 5);
        
        // Make sure we continue from the lowest point
        doc.y = Math.max(leftY, rightY) + 15;
        
        // Contact Details section with left-aligned header
        addSectionHeader('Contact Details');
        
        leftY = doc.y;
        rightY = doc.y;
        
        // Left column items
        leftY = addLabeledText('Owner', `${petData.user_firstname} ${petData.user_lastname}`, leftColumnX, leftY);
        leftY = addLabeledText('Email', petData.user_email, leftColumnX, leftY + 5);
        leftY = addLabeledText('Emergency Contact 1', `${petData.owner_alt_person1 || 'N/A'} - ${petData.owner_alt_contact1 || 'N/A'}`, leftColumnX, leftY + 5);
        leftY = addLabeledText('Emergency Contact 2', `${petData.owner_alt_person2 || 'N/A'} - ${petData.owner_alt_contact2 || 'N/A'}`, leftColumnX, leftY + 5);
        
        // Right column items
        rightY = addLabeledText('Contact number', petData.user_contact, rightColumnX, rightY);
        rightY = addLabeledText('Address', petData.owner_address, rightColumnX, rightY + 5);
        
        // Continue from the lowest point
        doc.y = Math.max(leftY, rightY) + 15;
        
        // Vaccination Record as table with left-aligned header
        addSectionHeader('Vaccination Record');
        
        // Create table headers
        const tableTop = doc.y;
        const tableWidth = pageWidth;
        const colWidth1 = tableWidth * 0.55; // 55% for vaccine type
        const colWidth2 = tableWidth * 0.2; // 20% for doses
        const colWidth3 = tableWidth * 0.25; // 25% for date
        const rowHeight = 25;
        
        // Table header
        doc.rect(leftColumnX, tableTop, tableWidth, rowHeight).stroke();
        
        // Vertical lines for column separation
        doc.moveTo(leftColumnX + colWidth1, tableTop).lineTo(leftColumnX + colWidth1, tableTop + rowHeight).stroke();
        doc.moveTo(leftColumnX + colWidth1 + colWidth2, tableTop).lineTo(leftColumnX + colWidth1 + colWidth2, tableTop + rowHeight).stroke();
        
        doc.font('Helvetica-Bold').fontSize(10)
        .text('Type of Vaccine', leftColumnX + 5, tableTop + 9, { width: colWidth1 - 10, align: 'center' })
        .text('Number of Doses', leftColumnX + colWidth1 + 5, tableTop + 9, { width: colWidth2 - 10, align: 'center' })
        .text('Date', leftColumnX + colWidth1 + colWidth2 + 5, tableTop + 9, { width: colWidth3 - 10, align: 'center' });
        
        // Table rows
        let rowY = tableTop + rowHeight;
        
        if (vaccineRecords.length > 0) {
            vaccineRecords.forEach((vaccine) => {
                doc.rect(leftColumnX, rowY, tableWidth, rowHeight).stroke();
                
                // Add vertical lines for column separation
                doc.moveTo(leftColumnX + colWidth1, rowY).lineTo(leftColumnX + colWidth1, rowY + rowHeight).stroke();
                doc.moveTo(leftColumnX + colWidth1 + colWidth2, rowY).lineTo(leftColumnX + colWidth1 + colWidth2, rowY + rowHeight).stroke();
                
                doc.font('Helvetica').fontSize(10)
                .text(vaccine.vaccine_type || 'N/A', leftColumnX + 5, rowY + 9, { width: colWidth1 - 10 })
                .text(vaccine.vaccine_doses, leftColumnX + colWidth1 + 5, rowY + 9, { width: colWidth2 - 10, align: 'center' })
                .text(vaccine.vaccine_date, leftColumnX + colWidth1 + colWidth2 + 5, rowY + 9, { width: colWidth3 - 10, align: 'center' });
                
                rowY += rowHeight;
            });
        } else {
            doc.rect(leftColumnX, rowY, tableWidth, rowHeight).stroke();
            doc.fontSize(10).text('No vaccination records', leftColumnX + 10, rowY + 9, { width: tableWidth - 20, align: 'center' });
            rowY += rowHeight;
        }
        
        // Continue after the table
        doc.y = rowY + 15;
        
        // Check if we need a new page before Medical Information
        if (doc.y > doc.page.height - 150) {
            doc.addPage();
            // Add header to new page - using the function for consistency
            addHeader(doc);
        }
        
        // Medical Information section with left-aligned header
        addSectionHeader('Medical Information');
        
        leftY = doc.y;
        rightY = doc.y;
        
        // Left column items
        leftY = addLabeledText('Weight', petData.record_weight, leftColumnX, leftY);
        leftY = addLabeledText('Temperature', petData.record_temp, leftColumnX, leftY + 5);
        leftY = addLabeledText('Condition', petData.record_condition, leftColumnX, leftY + 5);
        leftY = addLabeledText('Symptoms', petData.record_symptom, leftColumnX, leftY + 5);
        leftY = addLabeledText('Laboratories', petData.lab_description, leftColumnX, leftY + 5);
        
        // Right column items
        rightY = addLabeledText('Has past surgeries', petData.surgery_id ? 'Yes' : 'No', rightColumnX, rightY);
        rightY = addLabeledText('Date of surgery', petData.surgery_date ? new Date(petData.surgery_date).toLocaleDateString() : 'N/A', rightColumnX, rightY + 5);
        rightY = addLabeledText('Type of surgery', petData.surgery_type, rightColumnX, rightY + 5);
        
        // Continue from the lowest point
        doc.y = Math.max(leftY, rightY) + 15;
        
        // Check if we need a new page before Latest Diagnosis
        if (doc.y > doc.page.height - 150) {
            doc.addPage();
            // Add header to new page - using the function for consistency
            addHeader(doc);
        }
        
        // Latest Diagnosis section with left-aligned header
        addSectionHeader('Latest Diagnosis');
        
        // Add the diagnosis text with wrapping
        doc.font('Helvetica').fontSize(10).text(petData.diagnosis_text || 'N/A', {
            width: pageWidth,
            align: 'left'
        });
        
        doc.moveDown(1.5);
        
        // Check if we need a new page before Visit Details
        if (doc.y > doc.page.height - 150) {
            doc.addPage();
            // Add header to new page - using the function for consistency
            addHeader(doc);
        }
        
        // Visit Details section with left-aligned header
        addSectionHeader('Visit Details');
        
        // Add visit details
        let y = doc.y;
        y = addLabeledText('Recent Visit', petData.record_recent_visit ? new Date(petData.record_recent_visit).toLocaleDateString() : 'N/A', leftColumnX, y);
        y = addLabeledText('Purpose of Visit', petData.record_purpose, leftColumnX, y + 5);
        y = addLabeledText('Recent Purchase', petData.record_purchase, leftColumnX, y + 5);
        
        doc.moveDown(1.5);
        
        // Check if we need a new page before Attached Lab File
        if (doc.y > doc.page.height - 100) {
            doc.addPage();
            // Add header to new page - using the function for consistency
            addHeader(doc);
        }
        
        // Attached Lab File section with left-aligned header
        addSectionHeader('Attached Lab File');

        //if deployed on cloud, get the stored image in cloud
        // const imageUrl = rows[0].record_lab_file;  // Assuming it's stored as a URL
        // doc.image(imageUrl, { width: 300, height: 200 });

        //testing in local for now
        const imageFilename = petData.record_lab_file.toString();  
        const imagePath = path.join(__dirname, "../uploads", imageFilename); // Adjust your storage path

        if (fs.existsSync(imagePath)) {
            doc.image(imagePath, { width: 400, height: 200 });
        } else {
            doc.text("⚠️ Image file not found.");
        }
        
        doc.end();

        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });


        return pdfPath;
    } catch (error) {
        throw error;
    }
}

module.exports = generatePdf;