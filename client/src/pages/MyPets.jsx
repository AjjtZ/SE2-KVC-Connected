"use client";

import { Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/PatientDirectory.css";

export default function MyPets() {
  const navigate = useNavigate();
  const [originalPets, setOriginalPets] = useState([]);
  const [pets, setPets] = useState([]);

  useEffect(() => {
    const fetchMyPets = async () => {
      try {
        const response = await fetch("http://localhost:5000/pets/mypets", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch my pets");
        }

        const data = await response.json();
        console.log("Fetched my pets:", data);

        // Update state with fetched data
        setOriginalPets(data);
        setPets(data);
      } catch (error) {
        console.error("Error fetching my pets:", error);
      }
    };

    fetchMyPets();
  }, []);

  const handleViewProfile = (petId) => {
    console.log("Navigating to PetProfile with petId:", petId);
    navigate(`/PetProfile/${petId}`);
  };

  return (
    <div className="patient-directory">
      <div className="directory-header">
        <h2>My Pets</h2>
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            className="search-input"
            onChange={(e) => {
              const searchTerm = e.target.value.toLowerCase();
              const filteredPets = originalPets.filter((pet) =>
                pet.pet_name.toLowerCase().includes(searchTerm) || pet.species.toLowerCase().includes(searchTerm)
              );
              setPets(filteredPets);
            }}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Pet ID</th>
                <th>Pet Name</th>
                <th>Species</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pets.map((pet, index) => (
                <tr key={pet.pet_id} className={index % 2 === 0 ? "row-even" : "row-odd"}>
                  <td>{pet.pet_id}</td>
                  <td>{pet.pet_name}</td>
                  <td>{pet.species}</td>
                  <td className="actions">
                    <ArrowRight
                      size={16}
                      className="view-profile"
                      onClick={() => handleViewProfile(pet.pet_id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

