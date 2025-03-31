const db = require("../../server/config/db");
const PetModel = require("../../server/models/petModel");

jest.mock("../../server/config/db", () => {
  return {
    query: jest.fn(),
    execute: jest.fn(),
  };
});

describe("PetModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should find a pet by ID", async () => {
    const mockPet = { pet_id: 1, pet_name: "Buddy" };
    db.execute.mockResolvedValue([[mockPet]]);

    const pet = await PetModel.findById(1);
    expect(pet).toEqual(mockPet);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM pet_info WHERE pet_id = ?",
      [1]
    );
  });

  it("should return null if pet not found by ID", async () => {
    db.execute.mockResolvedValue([[]]);

    const pet = await PetModel.findById(1);
    expect(pet).toBeNull();
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM pet_info WHERE pet_id = ?",
      [1]
    );
  });

  it("should find species by description", async () => {
    const mockSpecies = { spec_id: 1, spec_description: "Dog" };
    db.execute.mockResolvedValue([[mockSpecies]]);

    const species = await PetModel.findSpeciesByDescription("Dog");
    expect(species).toEqual(mockSpecies);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM pet_species WHERE spec_description = ?",
      ["Dog"]
    );
  });

  it("should return null if species not found by description", async () => {
    db.execute.mockResolvedValue([[]]);

    const species = await PetModel.findSpeciesByDescription("Dog");
    expect(species).toBeNull();
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM pet_species WHERE spec_description = ?",
      ["Dog"]
    );
  });

  it("should create a new pet", async () => {
    const mockPetData = {
      petname: "Buddy",
      gender: "Male",
      speciesId: 1,
      breed: "Labrador",
      birthdate: "2020-01-01",
      userId: 1,
    };
    db.query.mockResolvedValue([{ insertId: 1 }]);

    const petId = await PetModel.createPet(mockPetData);
    expect(petId).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO pet_info (pet_name, pet_gender, pet_breed, pet_birthday, pet_vitality, pet_status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["Buddy", "Male", "Labrador", "2020-01-01", true, true, 1]
    );
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO match_pet_species (spec_id, pet_id) VALUES (?, ?)",
      [1, 1]
    );
  });

  it("should update a pet", async () => {
    const mockUpdateData = {
      pet_name: "Buddy",
      pet_breed: "Labrador",
    };
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await PetModel.updatePet(1, mockUpdateData);
    expect(result).toEqual({ affectedRows: 1 });
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE pet_info SET pet_name = ?, pet_breed = ? WHERE pet_id = ?",
      ["Buddy", "Labrador", 1]
    );
  });

  it("should update pet species", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await PetModel.updatePetSpecies(1, 2);
    expect(result).toEqual([{ affectedRows: 1 }]);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE match_pet_species SET spec_id = ? WHERE pet_id = ?",
      [2, 1]
    );
  });

  it("should archive a pet", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await PetModel.archivePet(1);
    expect(result).toEqual([{ affectedRows: 1 }]);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE pet_info SET pet_status = 0 WHERE pet_id = ?",
      [1]
    );
  });

  it("should restore a pet", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await PetModel.restorePet(1);
    expect(result).toEqual([{ affectedRows: 1 }]);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE pet_info SET pet_status = 1 WHERE pet_id = ?",
      [1]
    );
  });

  it("should get all active pets", async () => {
    const mockPets = [{ pet_id: 1, pet_name: "Buddy", pet_status: 1 }];
    db.execute.mockResolvedValue([mockPets]);

    const pets = await PetModel.getAllActivePets();
    expect(pets).toEqual(mockPets);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM pet_info WHERE pet_status = 1"
    );
  });

  it("should get all archived pets", async () => {
    const mockPets = [{ pet_id: 1, pet_name: "Buddy", pet_status: 0 }];
    db.execute.mockResolvedValue([mockPets]);

    const pets = await PetModel.getAllArchivedPets();
    expect(pets).toEqual(mockPets);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM pet_info WHERE pet_status = 0"
    );
  });
});
