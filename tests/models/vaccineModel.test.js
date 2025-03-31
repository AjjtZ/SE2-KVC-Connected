const db = require("../../server/config/db");
const VaccineModel = require("../../server/models/vaccineModel");

jest.mock("../../server/config/db", () => {
  return {
    query: jest.fn(),
    execute: jest.fn(),
  };
});

describe("VaccineModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get all vaccines", async () => {
    const mockVaccines = [{ vax_id: 1, vax_type: "Rabies" }];
    db.execute.mockResolvedValue([mockVaccines]);

    const vaccines = await VaccineModel.getAllVaccines();
    expect(vaccines).toEqual(mockVaccines);
    expect(db.execute).toHaveBeenCalledWith("SELECT * FROM vax_info");
  });

  it("should get vaccine by type", async () => {
    const mockVaccine = { vax_id: 1, vax_type: "Rabies" };
    db.execute.mockResolvedValue([[mockVaccine]]);

    const vaccine = await VaccineModel.getVaccineByType("Rabies");
    expect(vaccine).toEqual(mockVaccine);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM vax_info WHERE vax_type = ?",
      ["Rabies"]
    );
  });

  it("should return null if vaccine not found by type", async () => {
    db.execute.mockResolvedValue([[]]);

    const vaccine = await VaccineModel.getVaccineByType("Rabies");
    expect(vaccine).toBeNull();
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM vax_info WHERE vax_type = ?",
      ["Rabies"]
    );
  });

  it("should add pet vaccination record", async () => {
    const mockResult = { insertId: 1 };
    db.execute.mockResolvedValue([mockResult]);

    const result = await VaccineModel.addPetVaccinationRecord(
      1,
      1,
      1,
      "2022-01-01"
    );
    expect(result).toEqual(mockResult);
    expect(db.execute).toHaveBeenCalledWith(
      `INSERT INTO immunization_record (vax_id, pet_id, imm_rec_quantity, imm_rec_date) 
             VALUES (?, ?, ?, ?)`,
      [1, 1, 1, "2022-01-01"]
    );
  });
});
