"use client"

import { useState, useEffect, useCallback } from "react"
import AccountPage from "./AccountPage"
import { useNavigate } from "react-router-dom"

const MyAccount = () => {
  const [displayData, setDisplayData] = useState(null);
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("http://localhost:5000/user/myAccount", {
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
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        console.log("Fetched user data:", data);

        setDisplayData({
          firstName: data.firstname,
          lastName: data.lastname,
          role: data.role,
          email: data.email,
          contact: data.contact,
        });
        setEditData({
          firstName: data.firstname,
          lastName: data.lastname,
          role: data.role,
          email: data.email,
          contact: data.contact,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [logout]);

  const handleSave = async (updatedData) => {
    try {
      const response = await fetch("http://localhost:5000/user/update-employee-profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (response.status === 401) {
        console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
        await logout(); // Call logout function
        return; // Stop further processing in this function
      }

      if (!response.ok) {
        throw new Error("Failed to save user data");
      }

      const data = await response.json();
      console.log("Backend user data:", data);

      setDisplayData(data);
      setEditData(data);
      setIsEditing(false);
      console.log("Edit mode exited");
    } catch (error) {
      console.error("Error saving user data:", error);
      alert("Failed to save user data. Please try again.");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <AccountPage
      title="My Account"
      displayData={displayData}
      initialUserData={editData}
      isEditing={isEditing}
      setIsEditing={setIsEditing}
      onSave={handleSave}>
      {({ isEditing, userData, displayData, handleInputChange }) => (
        <div className="info-grid clinician-grid">
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
                  name="contact"
                  value={userData.contact}
                  onChange={handleInputChange}
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.contact}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </AccountPage>
  )
}

export default MyAccount
