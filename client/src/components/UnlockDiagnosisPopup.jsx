"use client";

<<<<<<< HEAD
import { useState } from "react";
import "../css/UnlockDiagnosis.css";

const UnlockModal = ({ isOpen, onClose, onUnlock, generatedAccessCode }) => {
  const [formData, setFormData] = useState({ accessCode: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedAccessCode = formData.accessCode.trim();
    console.log("Access code being entered:", trimmedAccessCode);

    // Compare the entered access code with the generated access code
    if (trimmedAccessCode !== generatedAccessCode) {
      alert("Invalid access code. Please try again.");
      return;
    }

    // If the access code matches, unlock the diagnosis
    console.log("Access code verified successfully!");
    onUnlock(trimmedAccessCode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Modify Diagnosis</h2>
        <p>Enter the access code provided by the clinic owner:</p>
        <form onSubmit={handleSubmit}>
          <textarea
            name="accessCode"
            placeholder="Enter access code"
            value={formData.accessCode}
            onChange={handleChange}
            required
          />
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="unlock-button">
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnlockModal;
=======

import { useState } from "react";
import "../css/UnlockDiagnosis.css";


const UnlockModal = ({ isOpen, onClose, onUnlock, generatedAccessCode }) => {
 const [formData, setFormData] = useState({ accessCode: "" });


 const handleChange = (e) => {
   setFormData({ ...formData, [e.target.name]: e.target.value });
 };


 const handleSubmit = (e) => {
   e.preventDefault();


   const trimmedAccessCode = formData.accessCode.trim();
   console.log("Access code being entered:", trimmedAccessCode);


   // Compare the entered access code with the generated access code
   if (trimmedAccessCode !== generatedAccessCode) {
     alert("Invalid access code. Please try again.");
     return;
   }


   // If the access code matches, unlock the diagnosis
   console.log("Access code verified successfully!");
   onUnlock(trimmedAccessCode);
   onClose();
 };


 if (!isOpen) return null;


 return (
   <div className="modal-overlay">
     <div className="modal-content">
       <h2>Modify Diagnosis</h2>
       <p>Enter the access code provided by the clinic owner:</p>
       <form onSubmit={handleSubmit}>
         <textarea
           name="accessCode"
           placeholder="Enter access code"
           value={formData.accessCode}
           onChange={handleChange}
           required
         />
         <div className="modal-buttons">
           <button type="button" onClick={onClose} className="cancel-button">
             Cancel
           </button>
           <button type="submit" className="unlock-button">
             Unlock
           </button>
         </div>
       </form>
     </div>
   </div>
 );
};


export default UnlockModal;
>>>>>>> origin/iahs-railway
