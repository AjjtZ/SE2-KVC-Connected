import React from 'react';
import "../css/ConfirmDialog.css"


const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <h2>Confirm Action</h2>
        <p>{message}</p>
        <div className="confirm-dialog-buttons">
          <button className="cancel-dialog-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-button" onClick={onConfirm}>
            Yes
          </button>
        </div>
      </div>
    </div>
  )
}


export default ConfirmDialog



