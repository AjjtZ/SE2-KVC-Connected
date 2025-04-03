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
    const { name, speciesDescription, gender, breed } = req.body;
    let birthday = req.body.birthday;
    // --- Make sure userId is reliably obtained ---
    // Check if req.user and req.user.userId exist. Adjust if your auth middleware sets it differently.
    if (!req.user || typeof req.user.userId === 'undefined') {
        console.error("Error adding pet: User ID not found in request. req.user:", req.user);
        return res.status(401).json({ error: "❌ Unauthorized or User ID missing." });
    }
    const userId = req.user.userId;
    // --- End userId check ---

    let connection; // Declare connection here to access it in finally block

    try {
        // Validate required fields *before* getting a connection
        if (!name || !speciesDescription || !gender) {
            return res.status(400).json({ error: "❌ Name, species, and gender are required." });
        }

        if (!birthday) {
            birthday = dayjs().format('YYYY-MM-DD'); // Set to today's date in SQL-friendly format
            console.log(`[addPetForOwner] Birthday was empty, defaulting to today: ${birthday}`);
        } else {
            // Optional: Validate the provided date format if needed
            if (!dayjs(birthday, 'YYYY-MM-DD', true).isValid()) {
                 // If you want strict YYYY-MM-DD format
                 return res.status(400).json({ error: "❌ Invalid birthday format. Please use YYYY-MM-DD." });
            }
             // No need for an else block if you just use the provided valid date
        }

        // 1. Get connection from the pool
        connection = await db.getConnection();
        console.log(`[addPetForOwner] DB Connection obtained for user ${userId}`);

        // 2. Start transaction
        await connection.beginTransaction();
        console.log(`[addPetForOwner] Transaction started for user ${userId}`);

        // Find the species ID based on the species description
        // Note: findSpeciesByDescription uses the global pool (db.execute),
        // which is usually okay here, but ideally, for strict transaction control,
        // it might also accept a connection. For now, this should work.
        const species = await PetModel.findSpeciesByDescription(speciesDescription);
        if (!species) {
            // If species not found, rollback before sending error
            await connection.rollback();
            console.log(`[addPetForOwner] Transaction rolled back - species not found: ${speciesDescription}`);
            connection.release(); // Release connection even on handled errors
            console.log(`[addPetForOwner] DB Connection released after species not found`);
            return res.status(400).json({ error: `❌ Species '${speciesDescription}' not found.` });
        }
        const speciesId = species.spec_id;
        console.log(`[addPetForOwner] Found speciesId ${speciesId} for description ${speciesDescription}`);

         // Function to calculate pet age in years and months
         const calculatePetAge = (birthdate) => {
            const birth = new Date(birthdate);
            const today = new Date();


            let years = today.getFullYear() - birth.getFullYear();
            let months = today.getMonth() - birth.getMonth();


            if (months < 0) {
                years--;
                months += 12;
            }


            return { years, months };
        };


        // Calculate pet age before creating a pet entry
        let petAgeYear = null;
        let petAgeMonth = null;


        if (birthday) {
            const age = calculatePetAge(birthday);
            petAgeYear = age.years;
            petAgeMonth = age.months;
        }


        // Prepare data object matching the model's expected parameters
        const petData = {
            petname: name,
            gender,
            speciesId,
            breed: breed || null, // Handle optional breed
            birthdate: birthday || null, // Handle optional birthday
            petAgeYear,
            petAgeMonth,
            userId,
        };

        // 3. Call PetModel.createPet, passing the data object AND the connection
        console.log(`[addPetForOwner] Calling PetModel.createPet with data:`, petData);
        const newPetId = await PetModel.createPet(petData, connection); // <-- PASS CONNECTION HERE
        console.log(`[addPetForOwner] PetModel.createPet successful, newPetId: ${newPetId}`);

        // 4. Commit transaction
        await connection.commit();
        console.log(`[addPetForOwner] Transaction committed for user ${userId}, petId ${newPetId}`);

        res.status(201).json({ message: "✅ Pet added successfully!", petId: newPetId });

    } catch (error) {
        console.error(`[addPetForOwner] Error adding pet for user ${userId}:`, error);

        // 5. Rollback transaction if connection exists and an error occurred
        if (connection) {
            try {
                await connection.rollback();
                console.log(`[addPetForOwner] Transaction rolled back for user ${userId} due to error.`);
            } catch (rollbackError) {
                console.error(`[addPetForOwner] Error rolling back transaction for user ${userId}:`, rollbackError);
                // Log rollback error but proceed with sending original error response
            }
        }

        // Send error response
        // Avoid sending detailed internal errors to the client in production
        res.status(500).json({ error: "❌ Server error while adding pet." });

    } finally {
        // 6. Always release the connection back to the pool
        if (connection) {
            try {
                connection.release();
                console.log(`[addPetForOwner] DB Connection released for user ${userId}`);
            } catch (releaseError) {
                console.error(`[addPetForOwner] Error releasing connection for user ${userId}:`, releaseError);
            }
        }
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

