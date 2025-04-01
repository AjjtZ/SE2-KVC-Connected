"use client";

<<<<<<< HEAD
import { createContext, useContext, useState } from "react";

const DiagnosisLockContext = createContext();

export function DiagnosisLockProvider({ children }) {
  const [isDiagnosisLocked, setIsDiagnosisLocked] = useState(true);
  const [unlockReason, setUnlockReason] = useState("");

  // Function to unlock the diagnosis
  const unlockDiagnosis = (reason) => {
    setUnlockReason(reason);
    setIsDiagnosisLocked(false);
  };

  // Function to lock the diagnosis
  const lockDiagnosis = () => {
    setUnlockReason(""); // Clear the unlock reason when locking
    setIsDiagnosisLocked(true);
  };

  return (
    <DiagnosisLockContext.Provider
      value={{
        isDiagnosisLocked,
        unlockDiagnosis,
        lockDiagnosis,
        unlockReason,
      }}
    >
      {children}
    </DiagnosisLockContext.Provider>
  );
=======

import { createContext, useContext, useState } from "react";


const DiagnosisLockContext = createContext();


export function DiagnosisLockProvider({ children }) {
 const [isDiagnosisLocked, setIsDiagnosisLocked] = useState(true);
 const [unlockReason, setUnlockReason] = useState("");


 // Function to unlock the diagnosis
 const unlockDiagnosis = (reason) => {
   setUnlockReason(reason);
   setIsDiagnosisLocked(false);
 };


 // Function to lock the diagnosis
 const lockDiagnosis = () => {
   setUnlockReason(""); // Clear the unlock reason when locking
   setIsDiagnosisLocked(true);
 };


 return (
   <DiagnosisLockContext.Provider
     value={{ isDiagnosisLocked, unlockDiagnosis, lockDiagnosis, unlockReason }}
   >
     {children}
   </DiagnosisLockContext.Provider>
 );
>>>>>>> origin/iahs-railway
}


export function useDiagnosisLock() {
<<<<<<< HEAD
  return useContext(DiagnosisLockContext);
}
=======
 return useContext(DiagnosisLockContext);
}
>>>>>>> origin/iahs-railway
