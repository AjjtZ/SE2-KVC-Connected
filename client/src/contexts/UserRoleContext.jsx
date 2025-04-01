"use client"

import { createContext, useContext, useState } from "react"

// roles and their permissions
export const ROLES = {
  DOCTOR: "doctor",
  CLINICIAN: "clinician",
  FRONT_DESK: "staff",
  PET_OWNER: "owner",
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
}

const UserRoleContext = createContext(null)

export function UserRoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(ROLES.DOCTOR) // yung current role

  const hasPermission = (permission) => {
    return PERMISSIONS[currentRole][permission]
  }

  return (
    <UserRoleContext.Provider value={{ currentRole, setCurrentRole, hasPermission }}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  const context = useContext(UserRoleContext)
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider")
  }
  return context
}

