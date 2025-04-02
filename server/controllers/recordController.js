//recordController.js
const db = require("../config/db")
const bcrypt = require('bcryptjs'); // Ensure bcryptjs is imported

const {
    getAllVisitRecords, insertDiagnosis, insertSurgeryInfo, insertRecord, insertMatchRecLab,
    getLabIdByDescription, updateMatchRecLab, getRecordById, updateDiagnosisText, updateSurgeryInfo, deleteSurgeryInfo, insertLabInfo
 } = require("../models/recordModel");
 const { authenticate, authorize } = require("../middleware/authMiddleware");
 const { sendEmail } = require("../utils/emailUtility");
 const crypto = require("crypto");
 
// to get a complete record with all related data
const getCompleteRecordById = async (recordId) => {
    try {
      const query = `
        SELECT
          r.record_id AS id,
          r.record_date AS date,
          r.record_purpose AS purposeOfVisit,
          r.record_weight AS weight,
          r.record_temp AS temperature,
          r.record_condition AS conditions,
          r.record_symptom AS symptoms,
          r.record_recent_visit AS recentVisit,
          r.record_purchase AS recentPurchase,
          r.record_lab_file AS file,
          l.lab_description AS laboratories,
          s.surgery_type AS surgeryType,
          s.surgery_date AS surgeryDate,
          d.diagnosis_text AS latestDiagnosis,
          r.pet_id AS petId,
          CASE WHEN s.surgery_id IS NOT NULL THEN TRUE ELSE FALSE END AS hadSurgery
        FROM record_info r
        LEFT JOIN lab_info l ON r.lab_id = l.lab_id
        LEFT JOIN surgery_info s ON r.surgery_id = s.surgery_id
        LEFT JOIN diagnosis d ON r.diagnosis_id = d.diagnosis_id
        WHERE r.record_id = ?
      `
  
  
      const [rows] = await db.query(query, [recordId])
  
  
      if (rows.length === 0) {
        return null
      }
  
  
      const record = {
        ...rows[0],
        hadSurgery: rows[0].hadSurgery === 1,       
        surgeryDate: rows[0].surgeryDate || null,
      }
  
  
      return record
    } catch (error) {
      console.error("Error getting complete record:", error)
      throw error
    }
  }
  
 
 const getVisitRecords = async (req, res) => {
  try {
    const { pet_id } = req.query;
 
 
    if (!pet_id) {
      return res.status(400).json({ error: "pet_id is required" });
    }
 
 
    const records = await getAllVisitRecords(pet_id); // Fetch records from the database
    console.log("Fetched visit records:", records); // Log the records to verify their structure
    res.json(records);
  } catch (error) {
    console.error("Error fetching visit records:", error);
    res.status(500).json({ error: "Failed to fetch visit records" });
  }
 };
 
 
 // Ensure clinicians request an access code before adding a diagnosis
 const addRecord = async (req, res) => {
  try {
    const { role } = req.user; // Assuming user role is available in req.user
    const { petId } = req.params;

    console.log("Adding record for pet ID:", petId) // debug
    console.log("Request body:", req.body) // debug
    
    const {
      record_date,
      record_weight,
      record_temp,
      record_condition,
      record_symptom,
      lab_description,
      diagnosis_text,
      surgery_type,
      surgery_date,
      record_recent_visit,
      record_purchase,
      record_purpose,
    } = req.body;
    
    const record_lab_file = req.file ? req.file.filename : null;

    console.log("DEBUG: req.body:", req.body);
    console.log("DEBUG: req.file:", req.file);

 
    // Validate required fields
    if (
      !record_date ||
      !record_weight ||
      !record_temp ||
      !record_condition ||
      !record_symptom ||
      !record_recent_visit ||
      !record_purchase ||
      !record_purpose
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }
 
 
    // ❌ Prevent clinicians from adding diagnosis
    if (role === "clinician" && diagnosis_text) {
      return res.status(403).json({ error: "Clinicians cannot add a diagnosis when creating a record." });
    }
 
 
    let lab_id = null;
    if (lab_description) {
      lab_id = await getLabIdByDescription(lab_description);
      if (!lab_id) {
        // If lab description doesn't exist, create it
        lab_id = await insertLabInfo(lab_description)
      }
    }
 
 
    let diagnosis_id = null;
    if (role === "doctor" && diagnosis_text) {
      diagnosis_id = await insertDiagnosis(diagnosis_text);
    }
 
 
    let surgery_id = null;
    if (surgery_type && surgery_date) {
      surgery_id = await insertSurgeryInfo(surgery_type, surgery_date);
    }
 
 
    const recordId = await insertRecord(
      petId,
      record_date,
      record_weight,
      record_temp,
      record_condition,
      record_symptom,
      record_recent_visit,
      record_purchase,
      record_purpose,
      record_lab_file,
      lab_id,
      diagnosis_id,
      surgery_id,
    )
 
    console.log(`Record created with ID: ${recordId}`)
 
    if (lab_id) {
      await insertMatchRecLab(recordId, lab_id);
    }
 
 
    // Fetch the newly added record
    const completeRecord = await getCompleteRecordById(recordId)

    if (!completeRecord) {
      return res.status(404).json({ error: "Failed to retrieve the newly created record." })
    }
    console.log("Complete newly added record:", completeRecord)
    res.status(201).json(completeRecord)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while adding medical record." });
  }
 };
 
 
 
 
 // Enforce access code validation for updating diagnosis
 const updateRecord = async (req, res) => {
    try {
        const { role } = req.user;
        const recordId = req.params.recordId || req.params.id
        console.log("Received record update request for record ID:", recordId)
        const {
            record_date, record_weight, record_temp, record_condition, record_symptom,
            lab_description, diagnosis_text, surgery_type, surgery_date,
            record_recent_visit, record_purchase, record_purpose, accessCode, hadSurgery
        } = req.body;
        const record_lab_file = req.file ? req.file.filename : null;
 
        const currentRecord = await getRecordById(recordId);
        if (!currentRecord) {
            console.error(`❌ Record with ID ${recordId} not found.`);
            return res.status(404).json({ error: "Record not found." });
        }
 
 
        if (role === "clinician" && diagnosis_text) {
          if (!req.session || !req.session.diagnosisAccessCode) {
              return res.status(403).json({ error: "Access code not requested or expired." });
          }
     
          if (accessCode !== req.session.diagnosisAccessCode) {
              console.error("❌ Invalid access code.");
              console.log("Session Access Code!!:", req.session.diagnosisAccessCode);
              console.log("Access Code Received!!:", accessCode);
              return res.status(403).json({ error: "Invalid access code." });
          }
      }
 
 
        // Doctors can update without an access code
 
 
        const updatedRecordData = {
            record_date: record_date || currentRecord.record_date,
            record_weight: record_weight || currentRecord.record_weight,
            record_temp: record_temp || currentRecord.record_temp,
            record_condition: record_condition || currentRecord.record_condition,
            record_symptom: record_symptom || currentRecord.record_symptom,
            record_recent_visit: record_recent_visit || currentRecord.record_recent_visit,
            record_purchase: record_purchase || currentRecord.record_purchase,
            record_purpose: record_purpose || currentRecord.record_purpose,
            lab_id: currentRecord.lab_id,
            diagnosis_id: currentRecord.diagnosis_id,
            surgery_id: currentRecord.surgery_id,
            record_lab_file: record_lab_file || currentRecord.record_lab_file
        };
 
 
        console.log("DEBUG: Updated Record Data:", updatedRecordData);
        console.log("DEBUG: req.file:", req.file);
 
 
        if (lab_description) {
            const lab_id = await getLabIdByDescription(lab_description);
            if (!lab_id) {
                return res.status(400).json({ error: "Invalid lab description." });
            }
            updatedRecordData.lab_id = lab_id;
        }
 
 
        if (diagnosis_text) {
          console.log("DEBUG: Diagnosis Text:", diagnosis_text); // Add this log
          if (role === "doctor") {
            if (!currentRecord.diagnosis_id) {
              const newDiagnosisId = await insertDiagnosis(diagnosis_text);
              updatedRecordData.diagnosis_id = newDiagnosisId;
            } else {
                const diagnosisText = Array.isArray(diagnosis_text) ? diagnosis_text[0] : diagnosis_text;
              await updateDiagnosisText(currentRecord.diagnosis_id, diagnosisText);
            }
          } else {
            // Clinicians need an access code
            if (req.session.diagnosisAccessCode && accessCode === req.session.diagnosisAccessCode) {
              if (!currentRecord.diagnosis_id) {
                const newDiagnosisId = await insertDiagnosis(diagnosis_text);
                updatedRecordData.diagnosis_id = newDiagnosisId; // ✅ Use updatedRecordData
                console.log(`New diagnosis added with ID: ${newDiagnosisId} and linked to record ID: ${recordId}`);
              } else {
                await updateDiagnosisText(currentRecord.diagnosis_id, diagnosis_text); // Pass correct parameters
              }
            } else {
              return res.status(403).json({ error: "Invalid or missing access code for diagnosis update." });
            }
          }
        }
       
        // ✅ Ensure diagnosis_id is preserved if not updated
        if (!("diagnosis_id" in updatedRecordData)) {
            updatedRecordData.diagnosis_id = currentRecord.diagnosis_id;
        }
       
        

    // Handle surgery updates
    console.log("Surgery update - hadSurgery:", hadSurgery) // debug
    console.log("Current surgery_id:", currentRecord.surgery_id)//debu


// 13. ADDED THIS —------------------
    if (hadSurgery === false) {
      if (currentRecord.surgery_id) {
        console.log(`Deleting surgery with ID: ${currentRecord.surgery_id}`)


        try {
          // set the surgery_id to NULL in the record_info table
          await db.query("UPDATE record_info SET surgery_id = NULL WHERE record_id = ?", [recordId])
          console.log(`Removed surgery_id reference from record ${recordId}`)


          // delete the surgery record from surgery_info table
          await db.query("DELETE FROM surgery_info WHERE surgery_id = ?", [currentRecord.surgery_id])
          console.log(`Deleted surgery record with ID: ${currentRecord.surgery_id}`)


          updatedRecordData.surgery_id = null
        } catch (error) {
          console.error("Error deleting surgery:", error)
        }
      }
    } else if (surgery_type !== undefined || surgery_date !== undefined) {
      if (surgery_type && surgery_date) {
        if (currentRecord.surgery_id) {
          // update existing surgery record
          await updateSurgeryInfo(currentRecord.surgery_id, surgery_type, surgery_date)
          // keep the same surgery_id
          updatedRecordData.surgery_id = currentRecord.surgery_id
        } else {
          // create new surgery record only if one doesn't exist
          const surgery_id = await insertSurgeryInfo(surgery_type, surgery_date)
          updatedRecordData.surgery_id = surgery_id
        }
      }
    }


    // ✅ Now update the record correctly
    console.log("Final record data to update:", updatedRecordData)


    // ensure all fields are updated correctly
    const updateFields = Object.keys(updatedRecordData)
      .map((key) => `${key} = ?`)
      .join(", ")


    const updateValues = [...Object.values(updatedRecordData), recordId]


    await db.query(`UPDATE record_info SET ${updateFields} WHERE record_id = ?`, updateValues)


    console.log("Final Update Executed!")


    if (updatedRecordData.lab_id !== currentRecord.lab_id) {
      await updateMatchRecLab(recordId, updatedRecordData.lab_id)
    }


    const completeRecord = await getCompleteRecordById(recordId)


    res.status(200).json({
      message: "Medical record updated successfully!",
      hadSurgery: updatedRecordData.surgery_id !== null,
      ...completeRecord,
    })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while updating medical record." });
    }
 };
 
 
 
 
 // Allow clinicians to request an access code
 const requestDiagnosisAccessCode = async (req, res) => {
    try {
        const accessCode = crypto.randomBytes(4).toString("hex").toUpperCase();
 
 
        if (!req.session) {
            return res.status(500).json({ error: "❌ Session is not initialized." });
        }
 
 
        req.session.diagnosisAccessCode = accessCode;
        console.log("Generated Access Code:", accessCode);
 
 
        const clinicOwnerEmail = process.env.CLINIC_OWNER_EMAIL;
        if (!clinicOwnerEmail) {
            return res.status(500).json({ error: "❌ Clinic owner email is not set." });
        }
 
 
        const subject = "Diagnosis Access Code Request - PAWtient Tracker";
        const body = `Hello Clinic Owner,\n\nA clinician has requested an access code to add or edit a diagnosis.\n\nAccess Code: ${accessCode}\n\nIf this request is unauthorized, please ignore this email.`;
 
 
        await sendEmail(clinicOwnerEmail, subject, body);
 
 
        // Include the access code in the response
        res.json({
          message: "✅ Access code request sent. Await access code from the clinic owner.",
          accessCode: accessCode // Pass the access code to the frontend
      });
    } catch (error) {
        console.error("Access Code Request Error:", error);
        res.status(500).json({ error: "❌ Server error while requesting access code." });
    }
 };
 
 
 module.exports = { getVisitRecords, addRecord, updateRecord, requestDiagnosisAccessCode};