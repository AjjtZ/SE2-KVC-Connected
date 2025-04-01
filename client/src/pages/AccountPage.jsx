"use client";

import { useState, useEffect } from "react";
import { Pencil, Save, Eye, EyeOff } from "lucide-react";
import "../css/AccountPage.css";

const AccountPage = ({ title, displayData, initialUserData, isEditing, setIsEditing, onSave, children }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [userData, setUserData] = useState(initialUserData);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    console.log("AccountPage - displayData updated:", displayData);
  }, [displayData]);

  useEffect(() => {
    console.log("AccountPage - initialUserData updated:", initialUserData);
    setUserData(initialUserData);
  }, [initialUserData]);

  const handleEdit = () => {
    console.log("AccountPage - Entering edit mode");
    setIsEditing(true);
    setUserData(initialUserData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`AccountPage - Input changed: ${name} = ${value}`);
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const handleSavePassword = async () => {
    try {
      console.log("Password Data:", passwordData);

      const response = await fetch("http://localhost:5000/user/change-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend Error:", errorData);
        throw new Error(errorData.error || "Failed to change password");
      }

      const data = await response.json();
      console.log("Password changed successfully:", data);

      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      alert("Password changed successfully!");
    } catch (error) {
      console.error("Error changing password:", error);
      alert(error.message || "Failed to change password. Please try again.");
    }
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <h1>{title}</h1>

        <div className="profile-container">
          <div className="profile-section">
            <div className="avatar-container">
              <div className="avatar-placeholder"></div>
              <h2>{`${displayData?.firstName || ""} ${displayData?.lastName || ""}`}</h2>
              <p className="role">{displayData?.role || ""}</p>
            </div>

            <div className="info-section">
              {!isChangingPassword && (
                <>
                  <div className="info-card">
                    <div className="card-header">
                      <h3>Personal Information</h3>
                      {isEditing ? (
                        <button className="save-profile-btn" onClick={() => onSave(userData)}>
                          <Save size={16} />
                          Save
                        </button>
                      ) : (
                        <button className="edit-profile-btn" onClick={handleEdit}>
                          <Pencil size={16} />
                          Edit Profile
                        </button>
                      )}
                    </div>

                    {children({ isEditing, userData, displayData, handleInputChange })}
                  </div>

                  <div className="info-card">
                    <div className="card-header">
                      <h3>Change Password</h3>
                      <button className="change-btn" onClick={() => setIsChangingPassword(true)}>
                        Change
                      </button>
                    </div>

                    <div className="password-section">
                      <label>Password</label>
                      <input type="password" value="••••••••••••••••••••••" readOnly className="password-input" />
                    </div>
                  </div>
                </>
              )}

              {isChangingPassword && (
                <div className="info-card full-width">
                  <div className="card-header">
                    <h3>Change Password</h3>
                  </div>
                  <div className="password-change-section">
                    <div className="password-group">
                      <label>Current Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="password-input"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => togglePasswordVisibility("current")}
                        >
                          {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="password-group">
                      <label>New Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="password-input"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => togglePasswordVisibility("new")}
                        >
                          {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="password-group">
                      <label>Confirm Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="password-input"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => togglePasswordVisibility("confirm")}
                        >
                          {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="password-actions">
                      <button className="save-changes-btn" onClick={handleSavePassword}>
                        Save Changes
                      </button>
                      <button className="cancel-btn" onClick={() => setIsChangingPassword(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;