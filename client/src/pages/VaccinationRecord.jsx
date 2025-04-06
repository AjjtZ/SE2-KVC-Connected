"use client"


import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"


export default function VaccinationRecord({ pet_id, hasPermission }) {
  const [vaccinations, setVaccinations] = useState([])
  const [vaccineType, setVaccineType] = useState("")
  const [doses, setDoses] = useState("")
  const [date, setDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({
    vaccineType: "",
    doses: "",
    date: ""
  })



  const vaccineTypes = [
    "3 in 1 (for Cats' 1st Vaccine)",
    "4 in 1 (for Cats' 2nd and succeeding shots)",
    "Kennel cough (for Dogs)",
    "2 in 1 (for Dogs' 1st Vaccine, usually for puppies)",
    "5 in 1 (for Dogs' 2nd and succeeding shots)",
    "Anti-rabies (3 months start or succeeding ages)",
  ]

  const navigate = useNavigate()

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

  // Fetch vaccination records when component mounts
  useEffect(() => {
    const fetchVaccinations = async () => {
      if (!pet_id) return


      setIsLoading(true)
      try {
        const response = await fetch(`http://localhost:5000/pets/${pet_id}/vaccines`, {
          credentials: "include",
        })

        if (response.status === 401) {
            console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
            await logout(); // Call logout function
            return; // Stop further processing in this function
          }

        if (!response.ok) {
          throw new Error("Failed to fetch vaccination records")
        }


        const data = await response.json()


        // Map the API data to match the expected structure in the table
        const formattedData = data.map((record) => ({
          id: record.id,
          vax_id: record.vax_id,
          type: record.vax_type,
          doses: record.imm_rec_quantity,
          date: formatDateToMMDDYYYY(record.imm_rec_date),
        }))


        setVaccinations(formattedData)
        setError(null)
      } catch (error) {
        console.error("Error fetching vaccination records:", error)
        setError("Failed to load vaccination records")
      } finally {
        setIsLoading(false)
      }
    }


    fetchVaccinations()
  }, [pet_id, logout])


  const getCurrentDate = () => {
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    const year = today.getFullYear()
    return `${month}/${day}/${year}`
  }


  const formatDateToMMDDYYYY = (dateString) => {
    if (!dateString) return ""


    try {
      // Create a Date object from the string
      const date = new Date(dateString)


      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // If it's not a valid date object, try parsing it manually
        if (dateString.includes("-")) {
          const [year, month, day] = dateString.split("-")
          return `${month}/${day}/${year}`
        }
        return dateString // Return as is if we can't parse it
      }


      // Format the date as MM/DD/YYYY
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const year = date.getFullYear()


      return `${month}/${day}/${year}`
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString // Return the original string if there's an error
    }
  }


  const formatDateToYYYYMMDD = (dateString) => {
    if (!dateString) return ""


    // If it's already in YYYY-MM-DD format
    if (dateString.includes("-") && dateString.split("-")[0].length === 4) {
      return dateString
    }


    // If it's in MM/DD/YYYY format
    if (dateString.includes("/")) {
      const [month, day, year] = dateString.split("/")
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }


    return dateString
  }


  const handleUpdateDose = async (index) => {
    if (!hasPermission("canAddVaccination")) return


    const vaccination = vaccinations[index]
    const updatedDoses = Number(vaccination.doses) + 1
    const today = new Date().toISOString().split("T")[0] // Format date to YYYY-MM-DD


    try {
      // Update UI first for better user experience
      setVaccinations((prevVaccinations) =>
        prevVaccinations.map((vax, i) => (i === index ? { ...vax, doses: updatedDoses, date: getCurrentDate() } : vax)),
      )


      // Then update the database
      const response = await fetch(`http://localhost:5000/pets/${pet_id}/vaccines/${vaccination.vax_id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imm_rec_quantity: updatedDoses,
          imm_rec_date: today,
        }),
      })

      if (response.status === 401) {
        console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
        await logout(); // Call logout function
        return; // Stop further processing in this function
      }


      if (!response.ok) {
        throw new Error("Failed to update vaccination record")
      }
    } catch (error) {
      console.error("Error updating vaccination record:", error)
      // Revert the UI change if the API call fails
      // You could fetch the data again here to ensure UI is in sync with database
    }
  }

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


  const validateForm = () => {
    const newErrors = {
      vaccineType: "",
      doses: "",
      date: ""
    };
    let isValid = true;


    if (!vaccineType) {
      newErrors.vaccineType = "Vaccine type is required";
      isValid = false;
    }


    if (!doses) {
      newErrors.doses = "Doses is required";
      isValid = false;
    }


    if (!date) {
      newErrors.date = "Date is required";
      isValid = false;
    } else {
      // Checks future date
      const dateError = validateDate(date);
      if (dateError) {
        newErrors.date = dateError;
        isValid = false;
      }
    }


    setErrors(newErrors);
    return isValid;
  }

  const handleInputChange = (field, value) => {
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }

    // Validate date if the field is date
    if (field === "date" && value) {
      const dateError = validateDate(value);
      if (dateError) {
        setErrors(prev => ({
          ...prev,
          date: dateError
        }));
      }
    }


    switch (field) {
      case "vaccineType":
        setVaccineType(value);
        break;
      case "doses":
        setDoses(value);
        break;
      case "date":
        setDate(value);
        break;
    }
  }


  const handleAddVaccination = async () => {
    if (!hasPermission("canAddVaccination")) return


    // Validate the form
    if (!validateForm()) {
      return; // Stop if validation fails
    }


    // Format date to YYYY-MM-DD for the API
    const formattedDate = formatDateToYYYYMMDD(date)


    try {
      // First update UI for better user experience
      const newVaccination = {
        type: vaccineType,
        doses: Number(doses),
        date: formatDateToMMDDYYYY(date),
      }


      setVaccinations([...vaccinations, newVaccination])


      // Clear the form
      setVaccineType("")
      setDoses("")
      setDate("")

      setErrors({
        vaccineType: "",
        doses: "",
        date: ""
      })



      // Then send to API
      const response = await fetch(`http://localhost:5000/pets/${pet_id}/vaccines`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vax_type: vaccineType,
          imm_rec_quantity: Number(doses),
          imm_rec_date: formattedDate,
        }),
      })

      if (response.status === 401) {
        console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
        await logout(); // Call logout function
        return; // Stop further processing in this function
      }

      if (!response.ok) {
        throw new Error("Failed to add vaccination record")
      }


      const newRecord = await response.json()
      console.log("Added vaccination record:", newRecord)


      // Update the vaccinations state with the correct ID from the server
      setVaccinations((prev) =>
        prev.map((vax, index) =>
          index === prev.length - 1
            ? {
                id: newRecord.id,
                vax_id: newRecord.vax_id,
                type: newRecord.vax_type,
                doses: newRecord.imm_rec_quantity,
                date: formatDateToMMDDYYYY(newRecord.imm_rec_date),
              }
            : vax,
        ),
      )
    } catch (error) {
      console.error("Error adding vaccination record:", error)
      // You could show an error message to the user here
    }
  }


  if (isLoading) {
    return <div>Loading vaccination records...</div>
  }


  if (error) {
    return <div>Error: {error}</div>
  }


  return (
    <div className="vaccination-record">
      <h2>Vaccination Record</h2>


      {hasPermission("canAddVaccination") && (
        <div className="vaccination-form">
          <div className="form-group">
            <label>
              Type of Vaccine<span className="required">*</span>
            </label>
            <select
              name="vaccineType"
              value={vaccineType}
              onChange={(e) => handleInputChange("vaccineType", e.target.value)}
              className={errors.vaccineType ? "input-error-pet" : ""}
            >
              <option value="">Select vaccine type</option>
              {vaccineTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.vaccineType && <span className="error-message-profile">{errors.vaccineType}</span>}
          </div>
          <div className="form-group">
            <label>
              Doses (Qty.)<span className="required">*</span>
            </label>
            <input
              type="number"
              min="1"
              name="doses"
              value={doses}
              onChange={(e) => handleInputChange("doses", e.target.value)}
              className={errors.doses ? "input-error-pet" : ""}
            />
            {errors.doses && <span className="error-message-profile">{errors.doses}</span>}
          </div>
          <div className="form-group">
          <label>Date<span className="required">*</span></label>
          <div className="date-input">
              <input
                type="date"
                placeholder="Select date"
                name="date"
                value={date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className={errors.date ? "input-error-pet" : ""}
              />
            </div>
            {errors.date && <span className="error-message-profile">{errors.date}</span>}
          </div>
          <button className="add-button" onClick={handleAddVaccination}>
            <Plus size={16} />
            Add
          </button>
        </div>
      )}


      <div className="vaccination-table">
        <table>
          <thead>
            <tr>
              <th>Type of Vaccine</th>
              <th>Doses (Qty.)</th>
              <th>Date</th>
              {hasPermission("canAddVaccination") && <th></th>}
            </tr>
          </thead>
          <tbody>
            {vaccinations.length === 0 ? (
              <tr>
                <td colSpan={hasPermission("canAddVaccination") ? 4 : 3} style={{ textAlign: "center" }}>
                  No vaccination records found
                </td>
              </tr>
            ) : (
              vaccinations.map((vax, index) => (
                <tr key={index}>
                  <td>{vax.type}</td>
                  <td>{vax.doses}</td>
                  <td>{vax.date}</td>
                  {hasPermission("canAddVaccination") && (
                    <td>
                      <button className="add-dose" onClick={() => handleUpdateDose(index)}>
                        +
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}





