const dayjs = require("dayjs");
const PetModel = require("../models/petModel");
const db = require("../config/db");

// Update pet profile (only for clinicians and doctors)
exports.updatePetProfile = async (req, res) => {
    const { pet_id } = req.params;
    const updateFields = req.body;

    console.log("Received update request:", { pet_id, ...updateFields });

    try {
        const existingPet = await PetModel.findById(pet_id);
        if (!existingPet) {
            return res.status(404).json({ error: "❌ Pet not found." });
        }

        let updatedData = {};
        Object.keys(updateFields).forEach((key) => {
            if (updateFields[key] !== undefined && updateFields[key] !== "" && key !== "speciesDescription") {
                updatedData[key] = updateFields[key];
            }
        });

        const isBirthdayUpdated = updatedData.pet_birthday !== undefined;
        const isAgeUpdated = updatedData.pet_age_year !== undefined || updatedData.pet_age_month !== undefined;

        if (isBirthdayUpdated) {
            const birthDate = dayjs(updatedData.pet_birthday);
            if (!birthDate.isValid()) {
                return res.status(400).json({ error: "❌ Invalid pet_birthday format. Use YYYY-MM-DD." });
            }

            const now = dayjs();
            const computedYears = now.diff(birthDate, "year");
            const computedMonths = now.diff(birthDate, "month") % 12;

            if (!isAgeUpdated) {
                // If only the birthday is updated, auto-update the ages
                updatedData.pet_age_year = computedYears;
                updatedData.pet_age_month = computedMonths;
            } else {
                // If both birthday and ages are updated, ensure they match
                if (
                    updatedData.pet_age_year !== computedYears ||
                    updatedData.pet_age_month !== computedMonths
                ) {
                    return res.status(400).json({
                        error: `❌ Age mismatch! The computed age based on birthday is ${computedYears} years and ${computedMonths} months.`,
                    });
                }
            }
        } else if (isAgeUpdated) {
            // If only age is updated, check if it matches the existing birthday
            const birthDate = dayjs(existingPet.pet_birthday);
            if (birthDate.isValid()) {
                const computedYears = dayjs().diff(birthDate, "year");
                const computedMonths = dayjs().diff(birthDate, "month") % 12;

                if (
                    updatedData.pet_age_year !== computedYears ||
                    updatedData.pet_age_month !== computedMonths
                ) {
                    return res.status(400).json({
                        error: `❌ Age mismatch! The computed age based on birthday is ${computedYears} years and ${computedMonths} months.`,
                    });
                }
            }
        }

        // If no valid fields are provided, return an error
        if (Object.keys(updatedData).length === 0 && !updateFields.speciesDescription) {
            return res.status(400).json({ error: "❌ No valid fields to update." });
        }

        // Perform the update on pet_info table
        if (Object.keys(updatedData).length > 0) {
            const result = await PetModel.updatePet(pet_id, updatedData);

            console.log("Update Result:", result);
            if (result.affectedRows === 0) {
                return res.status(400).json({ error: "❌ No changes made (pet ID may not exist or data is the same)." });
            }
        }

        // If species is being updated, update the match_pet_species table
        if (updateFields.speciesDescription) {
            const species = await PetModel.findSpeciesByDescription(updateFields.speciesDescription);
            if (!species) {
                return res.status(400).json({ error: "❌ Invalid species selected." });
            }
            const speciesId = species.spec_id;
            await PetModel.updatePetSpecies(pet_id, speciesId);
        }

        res.json({ message: "✅ Pet profile updated successfully!" });

    } catch (error) {
        console.error("Pet Profile Update Error:", error);
        res.status(500).json({ error: "❌ Server error: " + error.message });
    }
};

exports.archivePet = async (req, res) => {
    const { pet_id } = req.params;

    try {
        const pet = await PetModel.findById(pet_id);
        if (!pet) {
            return res.status(404).json({ error: "❌ Pet not found!" });
        }

        await PetModel.archivePet(pet_id);
        res.json({ message: `✅ Pet ${pet.pet_name} archived successfully!` });
    } catch (error) {
        console.error("Archive Pet Error:", error);
        res.status(500).json({ error: "❌ Server error during archiving pet." });
    }
};

exports.restorePet = async (req, res) => {
    const { pet_id } = req.params;

    try {
        const pet = await PetModel.findById(pet_id);
        if (!pet) {
            return res.status(404).json({ error: "❌ Pet not found!" });
        }

        await PetModel.restorePet(pet_id);
        res.json({ message: `✅ Pet ${pet.pet_name} restored successfully!` });
    } catch (error) {
        console.error("Restore Pet Error:", error);
        res.status(500).json({ error: "❌ Server error during restoring pet." });
    }
};

exports.getAllActivePets = async (req, res) => {
    try {
        const activePets = await PetModel.getAllActivePets();
        res.status(200).json(activePets);
    } catch (error) {
        res.status(500).json({ error: "❌ Error fetching active pets." });
    }
};

exports.getAllArchivedPets = async (req, res) => {
    try {
        const archivedPets = await PetModel.getAllArchivedPets();
        res.status(200).json(archivedPets);
    } catch (error) {
        res.status(500).json({ error: "❌ Error fetching archived pets." });
    }
};

exports.getPetById = async (req, res) => {
    const { pet_id } = req.params;

    try {
        const pet = await PetModel.findById(pet_id);
        if (!pet) {
            return res.status(404).json({ error: "❌ Pet not found!" });
        }

        res.status(200).json(pet);
    } catch (error) {
        console.error("Error fetching pet details:", error);
        res.status(500).json({ error: "❌ Server error while fetching pet details." });
    }
};

exports.addPetForOwner = async (req, res) => {
    const { name, speciesDescription, gender, breed, birthday } = req.body;
    const userId = req.user.userId; // Assuming the authenticated user's ID is available in req.user


    console.log("Authenticated User:", req.user);
    console.log("User ID:", userId);
    try {
        // Validate required fields
        if (!name || !speciesDescription || !gender) {
            return res.status(400).json({ error: "❌ Name, species, and gender are required." });
        }


        // Find the species ID based on the species description
        const species = await PetModel.findSpeciesByDescription(speciesDescription);
        if (!species) {
            return res.status(400).json({ error: "❌ Invalid species selected." });
        }


        const speciesId = species.spec_id;


        // Add the pet to the database
        const petId = await PetModel.createPet({
            petname: name,
            gender,
            speciesId,
            breed,
            birthdate: birthday || null, // Birthday is optional
            userId,
        });


        res.status(201).json({ message: "✅ Pet added successfully!", petId });
    } catch (error) {
        console.error("Error adding pet:", error);
        res.status(500).json({ error: "❌ Server error while adding pet." });
    }
};


// Function to get all pets of an owner
exports.getPetsByOwner = async (req, res) => {
    const userId = req.user.userId; // Extract user ID from the authenticated token

    try {
        const [pets] = await db.query(
            `
            SELECT 
                pet_info.pet_id,
                pet_info.pet_name,
                pet_info.pet_breed,
                pet_info.pet_gender,
                pet_info.pet_birthday,
                pet_species.spec_description AS species
            FROM pet_info
            JOIN match_pet_species ON pet_info.pet_id = match_pet_species.pet_id
            JOIN pet_species ON match_pet_species.spec_id = pet_species.spec_id
            WHERE pet_info.user_id = ?
            `,
            [userId]
        );

        res.json(pets);
    } catch (error) {
        console.error("Error fetching pets for owner:", error);
        res.status(500).json({ error: "Failed to fetch pets for owner" });
    }
};

