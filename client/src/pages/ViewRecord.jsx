"use client"




import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Pencil, Save } from "lucide-react"
import "../css/ViewRecord.css"
import { useDiagnosisLock } from "../contexts/DiagnosisLockContext"
import UnlockModal from "../components/UnlockDiagnosisPopup"
import { useConfirmDialog } from "../contexts/ConfirmDialogContext"
import MedicalRecordForm from "../components/MedicalRecordForm"
import { useUserRole } from "../contexts/UserRoleContext"
import { useParams } from "react-router-dom"
import { useNavigate } from "react-router-dom"




const ViewRecord = ({ record, onBack, onUpdate }) => {
 const { pet_id } = useParams();
 const { hasPermission } = useUserRole();
 const { showConfirmDialog } = useConfirmDialog();
 const [isModalOpen, setIsModalOpen] = useState(false);
 const { unlockDiagnosis, lockDiagnosis, isDiagnosisLocked } = useDiagnosisLock();
 const [isEditing, setIsEditing] = useState(false);
 const [editedRecord, setEditedRecord] = useState(record);
 const [loading, setLoading] = useState(true);
 const [errors, setErrors] = useState({});
 const navigate = useNavigate();

const logout = useCallback(async () => {
    console.log("Attempting logout due to session issue...");
    try {
      // Optional: Inform the backend about the logout attempt
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error during server logout request:", error);
      // Proceed with client-side logout even if server request fails
    } finally {
        console.log("Redirecting to /login");
        navigate("/login", { replace: true }); // Use replace to prevent going back to the expired page
    }
  }, [navigate]);

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


// to prevent future dates
const validateDate = (dateString) => {
  if (!dateString) return "";
 
  const selectedDate = new Date(dateString);
  const currentDate = new Date();
 
  // Reset the time portion to compare just the dates
  selectedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
 
  if (selectedDate > currentDate) {
    return "Future dates not allowed";
  }
  return "";
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

       if (response.status === 401) {
        console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
        await logout(); // Call logout function
        return; // Stop further processing in this function
      }


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
 }, [pet_id, logout]);




 const validateForm = () => {
   const newErrors = {}
   
   // Required fields validation
   if (!editedRecord.date) newErrors.date = "Date is required" //pwede delete
   if (!editedRecord.weight) newErrors.weight = "Weight is required"
   if (!editedRecord.temperature) newErrors.temperature = "Temperature is required"
   if (!editedRecord.conditions) newErrors.conditions = "Conditions is required"
   if (!editedRecord.symptoms) newErrors.symptoms = "Symptoms is required"
  // Validate recent visit date
  if (!editedRecord.recentVisit) {
    newErrors.recentVisit = "Recent visit date is required"
  } else {
    const dateError = validateDate(editedRecord.recentVisit);
    if (dateError) {
      newErrors.recentVisit = dateError;
    }
  }

   if (!editedRecord.recentPurchase) newErrors.recentPurchase = "Recent purchase is required"
   if (!editedRecord.purposeOfVisit) newErrors.purposeOfVisit = "Purpose of visit is required"


   // Validate surgery fields if hadSurgery is true
   if (editedRecord.hadSurgery === true) {
     if (!editedRecord.surgeryDate) newErrors.surgeryDate = "Surgery date is required"
     if (!editedRecord.surgeryType) newErrors.surgeryType = "Surgery type is required"
   }


   setErrors(newErrors)
   return Object.keys(newErrors).length === 0
 }




 const handleInputChange = (e) => {
   const { name, value, type } = e.target;
   console.log("Input Change Triggered:", { name, value, type })
   if (name === "hadSurgery") {
    const boolValue = value === "true" || value === true
    console.log("Setting hadSurgery to:", boolValue)


    setEditedRecord((prev) => ({
      ...prev,
      hadSurgery: boolValue,
      ...(boolValue === false ? { surgeryDate: "", surgeryType: "" } : {}),
    }));
   
    // Clear any hadSurgery error when user makes a selection (either yes or no)
    setErrors(prev => ({
      ...prev,
      hadSurgery: "",
      // Also clear surgery related errors when setting to false
      ...(boolValue === false ? { surgeryDate: "", surgeryType: "" } : {})
    }));
  } else if (type === "file") {
    const file = e.target.files[0];
    setEditedRecord((prev) => ({
        ...prev,
        [name]: file || prev[name],
        filePreview: file ? URL.createObjectURL(file) : prev.filePreview,
    }));
  } else {
    setEditedRecord((prev) => ({
        ...prev,
        [name]: value,
    }));
    if (name === "recentVisit" && value) {
      const dateError = validateDate(value);
      if (dateError) {
        setErrors(prev => ({
          ...prev,
          recentVisit: dateError
        }));
      }
    }

  }


  // Clear error for the field if it exists
  if (errors[name]) {
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }


  // Validate immediately if the field is empty
  if (!value && name !== 'file' && name !== 'laboratories' && name !== 'latestDiagnosis' && name !== 'hadSurgery') {
    setErrors(prev => ({
      ...prev,
      [name]: `${name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')} is required`
    }));
  }
}


const handleSave = () => {
  // Validate form first
  if (!validateForm()) {
    // Errors will be displayed through the errors state
    return;
  }
 
  showConfirmDialog("Do you want to save your changes?", () => {
    handleSubmit();
  });
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

     if (response.status === 401) {
      console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
      await logout(); // Call logout function
      return; // Stop further processing in this function
    }


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


   // Validate form first
   if (!validateForm()) {
     return; // Stop submission if validation fails
   }


   console.log("Record ID in handleSubmit:", record?.id);
   if (!record || !record.id) {
     console.error("Record ID is missing. Cannot update record.");
     return;
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
   appendField("lab_description", editedRecord.laboratories);
   appendField("surgery_type", editedRecord.hadSurgery ? editedRecord.surgeryType : null);
   appendField("surgery_date", editedRecord.hadSurgery && editedRecord.surgeryDate ? formatDateForServer(editedRecord.surgeryDate) : null);
   appendField("hadSurgery", editedRecord.hadSurgery);


  //Ensure Diagnosis Text and Access Code are Sent
    if (hasPermission("canAlwaysEditDiagnosis") || !isDiagnosisLocked) {
      appendField("diagnosis_text", editedRecord.latestDiagnosis);
      if (!hasPermission("canAlwaysEditDiagnosis")) {
        appendField("accessCode", editedRecord.accessCode);
      }
    }


    // ✅ Fix for File Handling
    if (editedRecord.file === null) {
      appendField("removeFile", "true"); //ADDED THIS
    } else if (editedRecord.file instanceof File) {
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
   
     
   console.log("Access Code Sent:", editedRecord.accessCode);
   
   
   try {
     console.log("Record ID in handleSubmit:", record.id);
     const response = await fetch(`http://localhost:5000/recs/records/${record.id}`, {
       method: "PUT",
       credentials: "include",
       body: formDataPayload,
     });


     if (response.status === 401) {
      console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
      await logout(); // Call logout function
      return; // Stop further processing in this function
    }

     if (!response.ok) {
       throw new Error("Failed to update the record");
     }




     const responseData = await response.json();
     console.log("Record updated successfully:", responseData);


     const updatedRecord = {
      id: record.id,
      date: responseData.date,
      purposeOfVisit: responseData.purposeOfVisit,
      weight: responseData.weight,
      temperature: responseData.temperature,
      conditions: responseData.conditions,
      symptoms: responseData.symptoms,
      recentVisit: responseData.recentVisit,
      recentPurchase: responseData.recentPurchase,
      lab_description: responseData.laboratories,
      surgeryType: responseData.surgeryType,
      surgeryDate: responseData.surgeryDate,
      latestDiagnosis: responseData.latestDiagnosis,
      hadSurgery: responseData.hadSurgery,
      record_lab_file: responseData.file, // Add this line
    }




    //Format dates for display
    const formattedRecord = {
      ...updatedRecord,
      date: formatDateForDisplay(updatedRecord.date),
      recentVisit: formatDateForDisplay(updatedRecord.recentVisit),
      surgeryDate: formatDateForDisplay(updatedRecord.surgeryDate),
     
    }




    // setEditedRecord(formattedRecord)
    // onUpdate(formattedRecord)


     // Fetch the updated record immediately after saving
     const fetchUpdatedRecord = async () => {
      const updatedResponse = await fetch(`http://localhost:5000/recs/records/${record.id}`);
      if (updatedResponse.status === 401) {
        console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
        await logout(); // Call logout function
        return; // Stop further processing in this function
      }
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
           <div className="button-group">
             <button className="save-button" onClick={handleSave}>
               Save
             </button>
             <button className="cancel-button" onClick={() => {
               setIsEditing(false);
               setEditedRecord(record); // Reset to original record data
               setErrors({}); // Clear any errors
             }}>
               Cancel
             </button>
           </div>
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
             onUnlockDiagnosis={handleRequestAccessCode}
             isAddRecord={false}
             errors={errors}
           />


           
         </div>
       </div>
     </div>




     <UnlockModal
       isOpen={isModalOpen}
       onClose={() => setIsModalOpen(false)}
       onUnlock={(accessCode) => handleUnlockDiagnosis(accessCode)}
       recordId={editedRecord.id}
       generatedAccessCode={editedRecord.accessCode}
     />
   </>
 )
}




export default ViewRecord



