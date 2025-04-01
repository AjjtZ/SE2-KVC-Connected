"use client"


import { useEffect } from "react"
import "../css/MedicalRecordForm.css"


// Helper function to format dates as MM/DD/YYYY
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


const MedicalRecordForm = ({
  formData,
  isEditing,
  isDiagnosisLocked,
  onInputChange,
  onUnlockDiagnosis,
  isAddRecord,
  errors,
}) => {
  // Debug log to check formData
  useEffect(() => {
    console.log("MedicalRecordForm formData:", formData)
  }, [formData])


  const renderField = (label, name, type = "text", options = {}) => {
    const value = formData[name]
    const { isFullWidth, isRequired, selectOptions } = options


    let input
    if (type === "select") {
      input = (
        <select
          id={name}
          name={name}
          value={value || ""}
          onChange={onInputChange}
          disabled={!isEditing}
          className={isEditing ? "editable-value" : ""}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    } else if (type === "radio") {
      input = (
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              id={`${name}-true`}
              name={name}
              value="true"
              checked={value === true}
              onChange={() => onInputChange({ target: { name, value: true } })}
              disabled={!isEditing}
            />
            Yes
          </label>
          <label className="radio-label">
            <input
              type="radio"
              id={`${name}-false`}
              name={name}
              value="false"
              checked={value === false}
              onChange={() => onInputChange({ target: { name, value: false } })}
              disabled={!isEditing}
            />
            No
          </label>
        </div>
      )
    } else if (type === "file") {
      input = (
          <div>
              {isEditing && (
                  <input
                      type="file"
                      id={name}
                      name={name}
                      onChange={onInputChange}
                      className="file-input"
                  />
              )}
               {/* Show previous file if it exists */}
              {value instanceof File ? (
                  <div>
                      <p className="file-name">{formData.laboratories} - {value.name}</p>
                      <img
                          src={URL.createObjectURL(value)} // ✅ Fix: Show file preview
                          alt={`${name} uploaded`}
                          style={{ maxWidth: "100%", maxHeight: "200px" }}
                      />
                      <a href={URL.createObjectURL(value)} target="_blank" rel="noopener noreferrer">
                          View File
                      </a>
                  </div>
              ) : typeof value === "string" && value.trim() !== "" ? (
                  <div>
                      <p className="file-name">{formData.laboratories} - {value.split('/').pop()}</p>
                      <img
                          src={value}
                          alt={`${name} uploaded`}
                          style={{ maxWidth: "100%", maxHeight: "200px" }}
                      />
                      <a href={value} target="_blank" rel="noopener noreferrer">
                          View File
                      </a>
                  </div>
              ) : (
                  <span>No file available</span>
              )}
          </div>
      );
  }
  else if (type === "date") {
      const displayValue = isEditing ? value : formatDateForDisplay(value)
      input = (
        <div className="date-input">
          <input
            type="date"
            id={name}
            name={name}
            value={value || ""}
            onChange={onInputChange}
            disabled={!isEditing}
            className={isEditing ? "editable-value" : ""}
          />
        </div>
      )
    } else if (type === "textarea") {
      input = (
        <textarea
          id={name}
          name={name}
          value={value || ""}
          onChange={onInputChange}
          rows={3}
          disabled={!isEditing || (name === "latestDiagnosis" && isDiagnosisLocked)}
          className={isEditing ? "editable-value" : ""}
        />
      )
    } else {
      input = (
        <input
          type={type}
          id={name}
          name={name}
          value={value || ""}
          onChange={onInputChange}
          disabled={!isEditing}
          className={isEditing ? "editable-value" : ""}
        />
      )
    }


    return (
      <div className={`form-field ${isFullWidth ? "full-width" : ""}`}>
        <label htmlFor={name}>
          {label}
          {isRequired && <span className="required">*</span>}
        </label>
        {isEditing || type === "radio" || type === "file" ? input : <span className="value-text">{value}</span>}
        {errors && errors[name] && <span className="error-message">{errors[name]}</span>}
        {name === "latestDiagnosis" && isDiagnosisLocked && isEditing && !isAddRecord && (
          <button type="button" className="unlock-diagnosis-btn" onClick={onUnlockDiagnosis}>
            Unlock Diagnosis
          </button>
        )}
      </div>
    ); 
 
  }


  return (
    <div className="medical-record-form">
      <section className="medical-info">
        <h2>Medical Information</h2>
        <div className="form-row">
          {renderField("Weight", "weight")}
          {renderField("Temperature", "temperature")}
        </div>
        <div className="form-row">
          {renderField("Conditions", "conditions")}
          {renderField("Symptoms", "symptoms")}
        </div>
        <div className="form-row">
          {renderField("Laboratories", "laboratories", "select", {
            selectOptions: ["CBC", "Ultrasound", "ECG", "X-ray", "Blood Chem", "Microscopy", "Progesterone Test"],
          })}
          {renderField("File", "file", "file")}
        </div>
        <div className="form-row">
          {renderField("Had past surgeries", "hadSurgery", "radio")}
          {formData.hadSurgery && renderField("Date of Surgery", "surgeryDate", "date")}
        </div>
        {formData.hadSurgery && (
          <div className="form-row">{renderField("Type of Surgery", "surgeryType", "text", { isFullWidth: true })}</div>
        )}
        <div className="form-row">
          {renderField("Latest Diagnosis", "latestDiagnosis", "textarea", { isFullWidth: true })}
        </div>
      </section>
      <section className="visit-details">
        <h2>Visit Details</h2>
        <div className="form-row">
          {renderField("Recent Visit", "recentVisit", "date")}
          {renderField("Recent Purchase", "recentPurchase")}
        </div>
        <div className="form-row">
          {renderField("Purpose of Visit", "purposeOfVisit", "text", { isFullWidth: true, isRequired: true })}
        </div>
      </section>
    </div>
  )
}


export default MedicalRecordForm





