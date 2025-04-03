"use client"

import { useState, useEffect, useCallback } from "react"
import AccountPage from "./AccountPage"
import { useNavigate } from "react-router-dom"

const OwnerMyAccount = () => {
  const [displayData, setDisplayData] = useState(null); // Initially null
  const [editData, setEditData] = useState(null); // Initially null
  const [isEditing, setIsEditing] = useState(false) // Track edit mode
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
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

  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        const response = await fetch("http://localhost:5000/user/owner/myAccount", {
          method: "GET",
          credentials: "include", // Include cookies for authentication
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.status === 401) {
          console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
          await logout(); // Call logout function
          return; // Stop further processing in this function
        }

        if (!response.ok) {
          throw new Error("Failed to fetch owner data")
        }

        const data = await response.json()
        console.log("Fetched owner data:", data)

        // Populate the display and edit states
        setDisplayData({
          firstName: data.firstname,
          lastName: data.lastname,
          role: "Pet Owner",
          email: data.email,
          contactNumber: data.contact,
          address: data.address,
          emergencyContact1: {
            person: data.altperson || "",
            number: data.altcontact || "",
          },
          emergencyContact2: {
            person: data.altperson2 || "",
            number: data.altcontact2 || "",
          },
        })

        setEditData({
          firstName: data.firstname,
          lastName: data.lastname,
          role: "Pet Owner",
          email: data.email,
          contactNumber: data.contact,
          address: data.address,
          emergencyContact1: {
            person: data.altperson || "",
            number: data.altcontact || "",
          },
          emergencyContact2: {
            person: data.altperson2 || "",
            number: data.altcontact2 || "",
          },
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching owner data:", error)
        setError(error.message)
        setIsLoading(false)
      }
    }

    fetchOwnerData()
  }, [logout])

  const processEmergencyContacts = (data) => {
    const processedData = { ...data }

    // If emergency contact 1 is empty but emergency contact 2 has data
    if (
      !processedData.emergencyContact1.person &&
      !processedData.emergencyContact1.number &&
      (processedData.emergencyContact2.person || processedData.emergencyContact2.number)
    ) {
      // Move emergency contact 2 data to emergency contact 1
      processedData.emergencyContact1 = { ...processedData.emergencyContact2 }
      processedData.emergencyContact2 = { person: "", number: "" }
    }

    // Clean up empty emergency contacts
    if (!processedData.emergencyContact1.person && !processedData.emergencyContact1.number) {
      processedData.emergencyContact1 = { person: "", number: "" }
    }
    if (!processedData.emergencyContact2.person && !processedData.emergencyContact2.number) {
      processedData.emergencyContact2 = { person: "", number: "" }
    }

    return processedData
  }

  const handleSave = async (updatedData) => {
    // Validate input fields
    const processedData = processEmergencyContacts(updatedData);

    // Check for empty or whitespace-only fields (except Emergency Contact 2 and Person 2)
    const requiredFields = [
      processedData.firstName,
      processedData.lastName,
      processedData.email,
      processedData.contactNumber,
      processedData.address,
      processedData.emergencyContact1.person,
      processedData.emergencyContact1.number,
    ];

    if (requiredFields.some((field) => !field || field.trim() === "")) {
      alert("All fields except Emergency Contact 2 and Person 2 are required and cannot be empty.");
      return;
    }

    // Validate Emergency Contact 2 and Person 2
    const { person: person2, number: contact2 } = processedData.emergencyContact2;
    if ((person2 && !contact2) || (!person2 && contact2)) {
      alert("If Emergency Contact Person 2 is provided, Emergency Contact Number 2 must also be provided, and vice versa.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/user/update-petowner-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          firstname: processedData.firstName,
          lastname: processedData.lastName,
          email: processedData.email,
          contact: processedData.contactNumber,
          address: processedData.address,
          altperson: processedData.emergencyContact1.person,
          altcontact: processedData.emergencyContact1.number,
          altperson2: person2 || null, // Set to null if empty
          altcontact2: contact2 || null, // Set to null if empty
        }),
      });

      if (response.status === 401) {
        console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
        await logout(); // Call logout function
        return; // Stop further processing in this function
      }

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const result = await response.json();
      console.log("Profile updated successfully:", result);

      setDisplayData(processedData); // Update the display data
      setEditData(processedData); // Update the edit data
      setIsEditing(false); // Exit edit mode
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    setEditData((prevData) => {
      const keys = name.split(".")
      if (keys.length > 1) {
        return {
          ...prevData,
          [keys[0]]: {
            ...prevData[keys[0]],
            [keys[1]]: value,
          },
        }
      }
      return { ...prevData, [name]: value }
    })
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <AccountPage
      title="My Account"
      displayData={displayData}
      initialUserData={editData}
      isEditing={isEditing}
      setIsEditing={setIsEditing}
      onSave={handleSave}
    >
      {({ isEditing, userData, handleInputChange }) => (
        <div className="info-grid">
          <div className="info-column">
            <div className="info-group">
              <label>First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleInputChange}
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.firstName}</div>
              )}
            </div>
            <div className="info-group">
              <label>Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="lastName"
                  value={userData.lastName}
                  onChange={handleInputChange}
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.lastName}</div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  onChange={handleInputChange}
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.email}</div>
              )}
            </div>
            <div className="info-group">
              <label>Contact Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="contactNumber"
                  value={userData.contactNumber}
                  onChange={handleInputChange}
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.contactNumber}</div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>Address</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={userData.address}
                  onChange={handleInputChange}
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.address}</div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>Emergency Contact Person 1</label>
              {isEditing ? (
                <input
                  type="text"
                  name="emergencyContact1.person"
                  value={userData.emergencyContact1.person}
                  onChange={(e) =>
                    handleInputChange({
                      target: {
                        name: "emergencyContact1",
                        value: { ...userData.emergencyContact1, person: e.target.value },
                      },
                    })
                  }
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.emergencyContact1.person || "Not provided"}</div>
              )}
            </div>
            <div className="info-group">
              <label>Emergency Contact Number 1</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="emergencyContact1.number"
                  value={userData.emergencyContact1.number}
                  onChange={(e) =>
                    handleInputChange({
                      target: {
                        name: "emergencyContact1",
                        value: { ...userData.emergencyContact1, number: e.target.value },
                      },
                    })
                  }
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.emergencyContact1.number || "Not provided"}</div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>Emergency Contact Person 2</label>
              {isEditing ? (
                <input
                  type="text"
                  name="emergencyContact2.person"
                  value={userData.emergencyContact2.person}
                  onChange={(e) =>
                    handleInputChange({
                      target: {
                        name: "emergencyContact2",
                        value: { ...userData.emergencyContact2, person: e.target.value },
                      },
                    })
                  }
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.emergencyContact2.person || "Not provided"}</div>
              )}
            </div>
            <div className="info-group">
              <label>Emergency Contact Number 2</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="emergencyContact2.number"
                  value={userData.emergencyContact2.number}
                  onChange={(e) =>
                    handleInputChange({
                      target: {
                        name: "emergencyContact2",
                        value: { ...userData.emergencyContact2, number: e.target.value },
                      },
                    })
                  }
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.emergencyContact2.number || "Not provided"}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </AccountPage>
  )
}

export default OwnerMyAccount

