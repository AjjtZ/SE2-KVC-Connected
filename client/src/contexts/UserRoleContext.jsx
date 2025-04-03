"use client"

import { createContext, useContext, useState, useEffect } from "react"

// roles and their permissions
export const ROLES = {
  DOCTOR: "doctor",
  CLINICIAN: "clinician",
  FRONT_DESK: "staff",
  PET_OWNER: "owner",
  UNKNOWN: null,
}

// permissions for each role
export const PERMISSIONS = {
  [ROLES.DOCTOR]: {
    canEditPetProfile: true,
    canAddVaccination: true,
    canAddRecord: true,
    canUpdateRecord: true,
    canViewContactInfo: true,
    canAlwaysEditDiagnosis: true, 
  },
  [ROLES.CLINICIAN]: {
    canEditPetProfile: true,
    canAddVaccination: true,
    canAddRecord: true,
    canUpdateRecord: true,
    canViewContactInfo: true,
    canAlwaysEditDiagnosis: false, 
  },
  [ROLES.FRONT_DESK]: {
    canEditPetProfile: false,
    canAddVaccination: false,
    canAddRecord: false,
    canUpdateRecord: false,
    canViewContactInfo: true,
    canAlwaysEditDiagnosis: false, 
  },
  [ROLES.PET_OWNER]: {
    canEditPetProfile: false,
    canAddVaccination: false,
    canAddRecord: false,
    canUpdateRecord: false,
    canViewContactInfo: false,
    canAlwaysEditDiagnosis: false, 
    canAddNewPet: true,
  },
  [ROLES.UNKNOWN]: {
    canEditPetProfile: false,
    canAddVaccination: false,
    canAddRecord: false,
    canUpdateRecord: false,
    canViewContactInfo: false,
    canAlwaysEditDiagnosis: false,
    canAddNewPet: false,
  },
}

const UserRoleContext = createContext(null)

const getInitialRole = () => {
  // We cannot check the httpOnly cookie directly.
  // We rely on the role being stored ONLY if login/verification was successful.
  const storedRole = localStorage.getItem("userRole");

  if (storedRole) {
    // Validate it's a known role
    if (Object.values(ROLES).includes(storedRole)) {
      console.log("Role initialized from localStorage:", storedRole);
      return storedRole;
    } else {
      console.warn("Invalid role found in localStorage:", storedRole);
      localStorage.removeItem("userRole"); // Clean up invalid data
      return ROLES.UNKNOWN;
    }
  }

  // No role stored means user is not logged in (or state is inconsistent)
  console.log("No role found in localStorage, initializing role as UNKNOWN.");
  return ROLES.UNKNOWN;
};

// This makes the initial state more reliable than just checking localStorage
const verifyAuthStatus = async () => {
  try {
    // Replace with your actual endpoint that verifies the cookie
    const response = await fetch("http://localhost:5000/auth/verify-token", { // Or '/auth/me' etc.
        method: "GET", // or POST depending on your backend
        credentials: "include" // ESSENTIAL to send the httpOnly cookie
    });

    if (!response.ok) {
       if (response.status === 401) { // Unauthorized
         console.log("Token verification failed (Unauthorized). User logged out.");
         return null; // Indicate logged out
       }
       throw new Error(`Verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    // **IMPORTANT**: Ensure your verify endpoint RETURNS the user's role
    if (data && data.role && Object.values(ROLES).includes(data.role)) {
        console.log("Token verified successfully by backend. Role:", data.role);
        return data.role; // Return the confirmed role
    } else {
        console.warn("Verification endpoint succeeded but did not return a valid role.");
        return null; // Treat as logged out if role isn't confirmed
    }
  } catch (error) {
    console.error("Error verifying auth status:", error);
    return null; // Treat as logged out on error
  }
};


export function UserRoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(ROLES.UNKNOWN) // yung current role

  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Effect to check auth status on initial load (more robust method)
  useEffect(() => {
    const checkAuth = async () => {
        setIsLoading(true);
        const verifiedRole = await verifyAuthStatus(); // Use the verification function

        if (verifiedRole) {
            // If backend confirms role, update local storage for consistency
            // (in case it was somehow cleared but cookie remained)
            localStorage.setItem("userRole", verifiedRole);
            setCurrentRole(verifiedRole);
        } else {
            // If verification fails or returns no role, ensure logged out state
            localStorage.removeItem("userRole");
            setCurrentRole(ROLES.UNKNOWN);
        }
        setIsLoading(false);
    };

    checkAuth();

    // Listener for storage changes (optional but good)
    const handleStorageChange = (event) => {
       if (event.key === "userRole") {
          console.log("userRole changed in storage, re-evaluating state.");
          // Could re-run checkAuth or just trust the new value if simple
           const newRole = localStorage.getItem("userRole");
           if (newRole && Object.values(ROLES).includes(newRole)) {
               setCurrentRole(newRole);
           } else {
               // If role removed or invalid, logout state
               if (currentRole !== ROLES.UNKNOWN) logout(); // Call logout to be sure
           }
       }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);

  }, []);

  const logout = async () => {
    console.log("Logging out...");
    localStorage.removeItem("userRole"); // Clear local role
    setCurrentRole(ROLES.UNKNOWN); // Update state immediately

    try {
      // *** IMPORTANT: Create a /logout endpoint on your backend ***
      // This endpoint should clear the 'token' cookie
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST", // or GET/DELETE
        credentials: "include" // Send the cookie to be cleared
      });
      console.log("Logout request sent to backend.");
      // Optional: Redirect after logout
      // window.location.href = '/login';
    } catch (error) {
      console.error("Error calling backend logout:", error);
    }
 };

  const hasPermission = (permission) => {
// Handle loading state if needed, maybe return false during load?
if (isLoading) return false;
const roleToCheck = currentRole || ROLES.UNKNOWN;
return PERMISSIONS[roleToCheck]?.[permission] ?? false;  }

return (
  <UserRoleContext.Provider value={{ currentRole, setCurrentRole /*(rarely used directly)*/, hasPermission, logout, isLoading }}>
    {!isLoading ? children : <div>Loading user...</div>} {/* Basic loading indicator */}
  </UserRoleContext.Provider>
);
}

export function useUserRole() {
  const context = useContext(UserRoleContext)
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider")
  }
  return context
}
