"use client";

import { useState } from "react";
<<<<<<< HEAD
=======
import { useNavigate } from "react-router-dom"; // Import useNavigate
>>>>>>> origin/iahs-railway
import "../css/AddNewPet.css";

export default function AddNewPet() {
  const [petData, setPetData] = useState({
    name: "",
    speciesDescription: "",
    gender: "male",
    breed: "",
    birthday: "",
  });
<<<<<<< HEAD
=======

  const navigate = useNavigate(); // Initialize navigate
>>>>>>> origin/iahs-railway

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPetData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/pets/add", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(petData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error adding pet:", errorData.error);
        alert(`Error: ${errorData.error}`);
        return;
      }

      const result = await response.json();
      console.log("Pet added successfully:", result);
      alert("Pet added successfully!");
<<<<<<< HEAD
=======

      // Redirect to MyPets page
      navigate("/MyPets");
>>>>>>> origin/iahs-railway
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while adding the pet.");
    }
  };

  return (
    <div className="add-pet-container">
      <div className="add-pet-header">
        <h1>Add New Pet</h1>
        <p>Type in the required information to add new pet</p>
      </div>

      <div className="pet-form-container">
        <div className="form-section-header">
          <h2>Pet Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="pet-form">
          <div className="form-row">
            <div className="form-field">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={petData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-field">
              <label>Species</label>
              <select
                name="speciesDescription"
                value={petData.speciesDescription}
                onChange={handleInputChange}
                required
              >
                <option value="">Select species</option>
                <option value="Dog (Standard)">Dog</option>
                <option value="Cat (Standard)">Cat</option>
                <option value="Snake (Exotic)">Snake</option>
<<<<<<< HEAD
                <option value="RabbitTurtles (Exotic)">Turtles</option>
                <option value="Birds (Exotic)">Birds</option>
=======
                <option value="Turtles (Exotic)">Turtles</option>
                <option value="Birds (Exotic)">Birds</option>
                <option value="Rabbit (Exotic)">Rabbit</option>
                <option value="Lab Rat (Exotic)">Lab Rat</option>
                <option value="Others">Others</option>
>>>>>>> origin/iahs-railway
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Gender</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={petData.gender === "male"}
                    onChange={handleInputChange}
                  />
                  Male
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={petData.gender === "female"}
                    onChange={handleInputChange}
                  />
                  Female
                </label>
              </div>
            </div>
            <div className="form-field">
              <label>Breed</label>
              <input
                type="text"
                name="breed"
                value={petData.breed}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row birthday-row">
            <div className="form-field">
              <label>Birthday (Optional)</label>
              <div className="date-input">
                <input
                  type="date"
                  name="birthday"
                  value={petData.birthday}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="form-field empty-field"></div>
          </div>

          <div className="form-actions">
            <button type="submit" className="add-pet-btn">
              Add Pet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
