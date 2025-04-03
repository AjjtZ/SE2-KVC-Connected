"use client";


import { useState, useEffect } from "react"
import { ArrowLeft, Pencil, Save } from "lucide-react"
import "../css/ViewRecord.css"
import { useDiagnosisLock } from "../contexts/DiagnosisLockContext"
import UnlockModal from "../components/UnlockDiagnosisPopup"
import { useConfirmDialog } from "../contexts/ConfirmDialogContext"
import MedicalRecordForm from "../components/MedicalRecordForm"
import { useUserRole } from "../contexts/UserRoleContext"
import { useParams } from "react-router-dom"


const ViewRecord = ({ record, onBack, onUpdate }) => {
 const { pet_id } = useParams();
 const { hasPermission } = useUserRole();
 const { showConfirmDialog } = useConfirmDialog();
 const [isModalOpen, setIsModalOpen] = useState(false);
 const { unlockDiagnosis, lockDiagnosis, isDiagnosisLocked } = useDiagnosisLock();
 const [isEditing, setIsEditing] = useState(false);
 const [editedRecord, setEditedRecord] = useState(record);
 const [loading, setLoading] = useState(true);
 const [error, setErrors] = useState({});

 const formatDateForDisplay = (dateString) => {
  if (!dateString) return ""


  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString // Return original if invalid


    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const year = date.getFullYear()


    return `${month}/${day}/${year}`
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString
  }
}


// to convert MM/DD/YYYY to YYYY-MM-DD for input fields
const formatDateForInput = (dateString) => {
  if (!dateString) return ""


  try {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }


    // If in MM/DD/YYYY format, convert to YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split("/")
      return `${year}-${month}-${day}`
    }


    // Otherwise, try to parse as date and format
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "" // Return empty if invalid


    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")


    return `${year}-${month}-${day}`
  } catch (error) {
    console.error("Error formatting date for input:", error)
    return ""
  }
}


// Format dates for display when record changes
useEffect(() => {
  if (record) {
    const formattedRecord = {
      ...record,
      date: formatDateForDisplay(record.date),
      recentVisit: formatDateForDisplay(record.recentVisit),
      surgeryDate: formatDateForDisplay(record.surgeryDate),
    }
    setEditedRecord(formattedRecord)
  }
}, [record])


// Convert dates to YYYY-MM-DD format when entering edit mode
useEffect(() => {
  if (isEditing && editedRecord) {
    setEditedRecord((prev) => ({
      ...prev,
      date: formatDateForInput(prev.date),
      recentVisit: formatDateForInput(prev.recentVisit),
      surgeryDate: formatDateForInput(prev.surgeryDate),
    }))
  } else if (!isEditing && editedRecord) {
    // Convert back to display format when exiting edit mode
    setEditedRecord((prev) => ({
      ...prev,
      date: formatDateForDisplay(prev.date),
      recentVisit: formatDateForDisplay(prev.recentVisit),
      surgeryDate: formatDateForDisplay(prev.surgeryDate),
    }))
  }
}, [isEditing])


 useEffect(() => {
   const fetchRecord = async () => {
     try {
       setLoading(true);
       const response = await fetch(`http://localhost:5000/recs/records/${pet_id}`, {
         method: "GET",
         credentials: include,
         headers: {
           "Content-Type": "application/json",
         },
       });


       if (!response.ok) {
         throw new Error("Failed to fetch record");
       }


       const data = await response.json();
       console.log("Fetched record:", data); // Debugging line
       if (!data.id) throw new Error("Fetched record has no ID");
       // Ensure hadSurgery is properly set based on surgeryType and surgeryDate
       const processedData = {
         ...data,
         hadSurgery: data.hadSurgery || (data.surgeryType && data.surgeryDate ? true : false),
         // Format dates for display
         date: formatDateForDisplay(data.date),
         recentVisit: formatDateForDisplay(data.recentVisit),
         surgeryDate: formatDateForDisplay(data.surgeryDate),
         file: data.record_lab_file || "",
       }


       console.log("Processed record data:", processedData) // Debugging


       setEditedRecord({ ...processedData, file: data.record_lab_file || "" }); // Set the fetched record data

     } catch (err) {
       setErrors(err.message);
     } finally {
       setLoading(false);
     }
   };


   fetchRecord();
 }, [pet_id]);


 const validateForm = () => {
   const newErrors = {}
   if (!editedRecord.purposeOfVisit) newErrors.purposeOfVisit = "Purpose of visit is required"

   // Validate surgery fields if hadSurgery is true
   if (editedRecord.hadSurgery) {
    if (!editedRecord.surgeryDate) newErrors.surgeryDate = "Surgery date is required when 'Had past surgeries' is Yes"
    if (!editedRecord.surgeryType) newErrors.surgeryType = "Surgery type is required when 'Had past surgeries' is Yes"
  }

  if (!editedRecord.date) newErrors.date = "Date is required";
  if (!editedRecord.weight) newErrors.weight = "Weight is required";
  if (!editedRecord.temperature) newErrors.temperature = "Temperature is required";
  if (!editedRecord.conditions) newErrors.conditions = "Conditions are required";
  if (!editedRecord.symptoms) newErrors.symptoms = "Symptoms are required";
  if (!editedRecord.recentVisit) newErrors.recentVisit = "Recent visit date is required";
  if (!editedRecord.recentPurchase) newErrors.recentPurchase = "Recent purchase date is required";

   setErrors(newErrors) // Use setErrors to update the error state
   return Object.keys(newErrors).length === 0
 }


 const handleInputChange = (e) => {
   const { name, value, type } = e.target;
   console.log("Input Change Triggered:", { name, value, type })
   if (name === "hadSurgery") {
    // Convert string "true"/"false" to boolean
    const boolValue = value === "true" || value === true
    console.log("Setting hadSurgery to:", boolValue)


    setEditedRecord((prev) => ({
      ...prev,
      hadSurgery: boolValue,
      // Clear surgery fields if hadSurgery is set to false
      ...(boolValue === false ? { surgeryDate: "", surgeryType: "" } : {}),
    }));
  } else if (type === "file") {
    const file = e.target.files[0];
    setEditedRecord((prev) => ({
        ...prev,
        [name]: file || prev[name], // ✅ Keep existing file if no new file is selected
        filePreview: file ? URL.createObjectURL(file) : prev.filePreview, // ✅ Maintain preview
    }));
} else {
    setEditedRecord((prev) => ({
        ...prev,
        [name]: e.target.value,
    }));
}


  // Clear errors for the field if it exists
    if (error[name]) {
     setErrors((prev) => ({
       ...prev,
       [name]: "",
     }))
   }
 }

  const handleSave = () => {
   if (validateForm()) {
     showConfirmDialog("Do you want to save your changes?", () => {
       handleSubmit(); // Call handleSubmit to send the data to the backend
     });
   }
 };


 // Function to request access code and open the modal
 const handleRequestAccessCode = async () => {
   try {
     const response = await fetch("http://localhost:5000/recs/records/request-access-code", {
       method: "GET",
       credentials: "include",
       headers: {
         "Content-Type": "application/json",
       },
     });


     if (!response.ok) {
       throw new Error("Failed to request access code");
     }


     const data = await response.json();


     // Store the access code in the state
     setEditedRecord((prev) => ({
       ...prev,
       accessCode: data.accessCode, // Save the access code in the record state
     }));


     setIsModalOpen(true); // Open the modal after requesting the code
   } catch (error) {
     console.error("Error requesting access code:", error);
   }
 };


 const handleUnlockDiagnosis = (accessCode) => {
   unlockDiagnosis(); // Unlock the diagnosis field
   setEditedRecord((prev) => ({
     ...prev,
     accessCode, // Save the validated access code
   }))
 }

 // Add this helper function to format dates for the server (YYYY-MM-DD)
 const formatDateForServer = (dateString) => {
  if (!dateString) return null


  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }


  try {
    const parts = dateString.split("/")
    if (parts.length === 3) {
      // If in MM/DD/YYYY format
      const [month, day, year] = parts
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }


    // Otherwise, try to parse as date and format
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString // Return original if invalid


    return date.toISOString().split("T")[0]
  } catch (error) {
    console.error("Error formatting date for server:", error)
    return dateString
  }
}


 const handleSubmit = async (e) => {
   if (e) e.preventDefault();


   console.log("Record ID in handleSubmit:", record?.id);
   if (!record || !record.id) {
     console.error("Record ID is missing. Cannot update record.");
     return
   }

   console.log("Edited Record:", editedRecord);


   const formDataPayload = new FormData();


   const appendField = (key, value) => {
     if (value !== undefined && value !== null && value !== "") {
       formDataPayload.append(key, value);
     } else {
       console.warn(`⚠️ Skipping empty field: ${key}`);
     }
   };

   appendField("record_date", editedRecord.date ? formatDateForServer(editedRecord.date) : null);
   appendField("record_weight", editedRecord.weight);
   appendField("record_temp", editedRecord.temperature);
   appendField("record_condition", editedRecord.conditions);
   appendField("record_symptom", editedRecord.symptoms);
   appendField("record_recent_visit", editedRecord.recentVisit ? formatDateForServer(editedRecord.recentVisit) : null);
   appendField("record_purchase", editedRecord.recentPurchase);
   appendField("record_purpose", editedRecord.purposeOfVisit);
   appendField("diagnosis_text", editedRecord.latestDiagnosis);
   appendField("lab_description", editedRecord.laboratories);
   appendField("surgery_type", editedRecord.hadSurgery ? editedRecord.surgeryType : null);
   appendField("surgery_date", editedRecord.hadSurgery && editedRecord.surgeryDate ? formatDateForServer(editedRecord.surgeryDate) : null);
   appendField("accessCode", editedRecord.accessCode); // Include access code for clinicians
   appendField("hadSurgery", editedRecord.hadSurgery);

     
    // ✅ Fix for File Handling
    if (editedRecord.file instanceof File) {
      formDataPayload.append("record_lab_file", editedRecord.file);
    } else if (typeof editedRecord.file === "string" && editedRecord.file.startsWith("http")) {
      formDataPayload.append("record_lab_file", editedRecord.file);
    } else {
      console.warn("⚠️ No valid file found.");
    }
 
 
    // 🚀 Log FormData Contents Before Sending
    console.log("✅ Final FormData Entries:");
    for (let pair of formDataPayload.entries()) {
      console.log(pair[0] + ": ", pair[1]);
    }
 
 
    // ✅ Ensure Diagnosis Text and Access Code Are Sent
    if (hasPermission("canAlwaysEditDiagnosis") || !isDiagnosisLocked) { 
      formDataPayload.append("diagnosis_text", editedRecord.latestDiagnosis);
      if (!hasPermission("canAlwaysEditDiagnosis")) { 
        formDataPayload.append("accessCode", editedRecord.accessCode);
      }
    }
    
     
   console.log("Access Code Sent:", editedRecord.accessCode);
   
   
   try {
     console.log("Record ID in handleSubmit:", record.id);
     const response = await fetch(`http://localhost:5000/recs/records/${record.id}`, {
       method: "PUT",
       credentials: "include",
       body: formDataPayload,
     });


     if (!response.ok) {
       throw new Error("Failed to update the record");
     }


    //  const responseData = await response.json();
    //  console.log("Record updated successfully:", responseData);

    //  const updatedRecord = {
    //   id: record.id,
    //   date: responseData.date,
    //   purposeOfVisit: responseData.purposeOfVisit,
    //   weight: responseData.weight,
    //   temperature: responseData.temperature,
    //   conditions: responseData.conditions,
    //   symptoms: responseData.symptoms,
    //   recentVisit: responseData.recentVisit,
    //   recentPurchase: responseData.recentPurchase,
    //   lab_description: responseData.laboratories,
    //   surgeryType: responseData.surgeryType,
    //   surgeryDate: responseData.surgeryDate,
    //   latestDiagnosis: responseData.latestDiagnosis,
    //   hadSurgery: responseData.hadSurgery,
    //   record_lab_file: responseData.file, // Add this line
    // }


    // Format dates for display
    // const formattedRecord = {
    //   ...updatedRecord,
    //   date: formatDateForDisplay(updatedRecord.date),
    //   recentVisit: formatDateForDisplay(updatedRecord.recentVisit),
    //   surgeryDate: formatDateForDisplay(updatedRecord.surgeryDate),
      
    // }


    // setEditedRecord(formattedRecord) // 10. ADDED THIS
    // onUpdate(formattedRecord) // 11. EDITED THIS

     // Fetch the updated record immediately after saving
     const fetchUpdatedRecord = async () => {
      const updatedResponse = await fetch(`http://localhost:5000/recs/records/${record.id}`);
      if (!updatedResponse.ok) throw new Error("Failed to fetch updated record");
      const updatedData = await updatedResponse.json();

      setEditedRecord({
          ...updatedData,
          date: formatDateForDisplay(updatedData.date),
          recentVisit: formatDateForDisplay(updatedData.recentVisit),
          surgeryDate: formatDateForDisplay(updatedData.surgeryDate),
          file: updatedData.record_lab_file || "",
      });

      onUpdate(updatedData); // Update parent component
  };

  fetchUpdatedRecord();
    
    lockDiagnosis()
    setIsEditing(false)
   // alert("Record updated successfully!")
    
   } catch (error) {
     console.error("Error updating record:", error);
   }
 }




 return (
   <>
     <div className="view-record-container">
       <div className="record-header">
         <div className="header-left">
           <button className="back-button" onClick={onBack}>
             <ArrowLeft size={24} />
           </button>
           <span>Pet's Record for: {!isEditing ? editedRecord.date : formatDateForDisplay(editedRecord.date)}</span>
         </div>
         {hasPermission("canUpdateRecord") && (
           <>
         {isEditing ? (
           <button className="save-button" onClick={handleSave}>
             <Save size={16} />
             Save
           </button>
         ) : (
           <button className="update-button" onClick={() => setIsEditing(true)}>
             <Pencil size={16} />
             Update
           </button>
            )}
           </>
         )}
       </div>


       <div className="record-content">
         <div className="scrollable-content">
           <MedicalRecordForm
             formData={editedRecord}
             isEditing={isEditing}
             isDiagnosisLocked={!hasPermission("canAlwaysEditDiagnosis") && isDiagnosisLocked}
             onInputChange={handleInputChange}
             onUnlockDiagnosis={handleRequestAccessCode} // Request access code
             isAddRecord={false}
             error={error}
           />

           
         </div>
       </div>
     </div>


     <UnlockModal
       isOpen={isModalOpen}
       onClose={() => setIsModalOpen(false)}
       onUnlock={(accessCode) => handleUnlockDiagnosis(accessCode)} // Pass the access code
       recordId={editedRecord.id}
       generatedAccessCode={editedRecord.accessCode}
     />
   </>
 )
}


export default ViewRecord
