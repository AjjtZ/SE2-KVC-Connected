const db = require("../../server/config/db");
const {
  insertLabInfo,
  getLabIdByDescription,
  insertDiagnosis,
  insertSurgeryInfo,
  insertRecord,
  updateRecordInDB,
  getRecordById,
  insertMatchRecLab,
  updateMatchRecLab,
  updateDiagnosisText,
} = require("../../server/models/recordModel");

jest.mock("../../server/config/db", () => {
  return {
    query: jest.fn(),
    execute: jest.fn(),
  };
});

describe("RecordModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should insert lab info and return the lab ID", async () => {
    db.query.mockResolvedValue([{ insertId: 1 }]);

    const labId = await insertLabInfo("Blood Test");
    expect(labId).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO lab_info (lab_description) VALUES (?)",
      ["Blood Test"]
    );
  });

  it("should get lab ID by description", async () => {
    db.query.mockResolvedValue([[{ lab_id: 1 }]]);

    const labId = await getLabIdByDescription("Blood Test");
    expect(labId).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      "SELECT lab_id FROM lab_info WHERE lab_description = ?",
      ["Blood Test"]
    );
  });

  it("should return null if lab ID not found by description", async () => {
    db.query.mockResolvedValue([[]]);

    const labId = await getLabIdByDescription("Blood Test");
    expect(labId).toBeNull();
    expect(db.query).toHaveBeenCalledWith(
      "SELECT lab_id FROM lab_info WHERE lab_description = ?",
      ["Blood Test"]
    );
  });

  it("should insert diagnosis and return the diagnosis ID", async () => {
    db.query.mockResolvedValue([{ insertId: 1 }]);

    const diagnosisId = await insertDiagnosis("No issues");
    expect(diagnosisId).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO diagnosis (diagnosis_text) VALUES (?)",
      ["No issues"]
    );
  });

  it("should insert surgery info and return the surgery ID", async () => {
    db.query.mockResolvedValue([{ insertId: 1 }]);

    const surgeryId = await insertSurgeryInfo("Neutering", "2022-01-01");
    expect(surgeryId).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO surgery_info (surgery_type, surgery_date) VALUES (?, ?)",
      ["Neutering", "2022-01-01"]
    );
  });

  it("should insert a record and return the record ID", async () => {
    const mockRecordData = {
      record_date: "2022-01-01",
      record_weight: 10,
      record_temp: 37.5,
      record_condition: "Healthy",
      record_symptom: "None",
      record_recent_visit: "2022-01-01",
      record_purchase: "Food",
      record_purpose: "Checkup",
      lab_id: 1,
      diagnosis_id: 1,
      surgery_id: 1,
      record_lab_file: null,
    };
    db.query.mockResolvedValue([{ insertId: 1 }]);

    const recordId = await insertRecord(1, mockRecordData);
    expect(recordId).toBe(1);

    expect(db.query).toHaveBeenCalledWith(
      `INSERT INTO record_info (pet_id, record_date, record_weight, record_temp, record_condition, 
            record_symptom, record_recent_visit, record_purchase, record_purpose, lab_id, diagnosis_id, surgery_id, record_lab_file)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1,
        "2022-01-01",
        10,
        37.5,
        "Healthy",
        "None",
        "2022-01-01",
        "Food",
        "Checkup",
        1,
        1,
        1,
        null,
      ]
    );
  });

  it("should update a record in the database", async () => {
    const mockRecordData = {
      record_date: "2022-01-02",
      record_weight: 11,
      record_temp: 38,
      record_condition: "Sick",
      record_symptom: "Cough",
      record_recent_visit: "2022-01-02",
      record_purchase: "Medicine",
      record_purpose: "Treatment",
      diagnosis_id: 2,
    };
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    const affectedRows = await updateRecordInDB(1, mockRecordData);
    expect(affectedRows).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      "UPDATE record_info SET record_date = ?, record_weight = ?, record_temp = ?, record_condition = ?, record_symptom = ?, record_recent_visit = ?, record_purchase = ?, record_purpose = ?, diagnosis_id = ? WHERE record_id = ?",
      [
        "2022-01-02",
        11,
        38,
        "Sick",
        "Cough",
        "2022-01-02",
        "Medicine",
        "Treatment",
        2,
        1,
      ]
    );
  });

  it("should get a record by ID", async () => {
    const mockRecord = { record_id: 1, record_date: "2022-01-01" };
    db.query.mockResolvedValue([[mockRecord]]);

    const record = await getRecordById(1);
    expect(record).toEqual(mockRecord);
    expect(db.query).toHaveBeenCalledWith(
      "SELECT * FROM record_info WHERE record_id = ?",
      [1]
    );
  });

  it("should return null if record not found by ID", async () => {
    db.query.mockResolvedValue([[]]);

    const record = await getRecordById(1);
    expect(record).toBeNull();
    expect(db.query).toHaveBeenCalledWith(
      "SELECT * FROM record_info WHERE record_id = ?",
      [1]
    );
  });

  it("should insert match record lab", async () => {
    await insertMatchRecLab(1, 1);
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO match_rec_lab (record_id, lab_id) VALUES (?, ?)",
      [1, 1]
    );
  });

  it("should update match record lab", async () => {
    await updateMatchRecLab(1, 1);
    expect(db.query).toHaveBeenCalledWith(
      "DELETE FROM match_rec_lab WHERE record_id = ?",
      [1]
    );
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO match_rec_lab (record_id, lab_id) VALUES (?, ?)",
      [1, 1]
    );
  });

  it("should update diagnosis text", async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await updateDiagnosisText(1, "Updated diagnosis");
    expect(result).toEqual({ affectedRows: 1 });
    expect(db.query).toHaveBeenCalledWith(
      "UPDATE diagnosis SET diagnosis_text = ? WHERE diagnosis_id = ?",
      ["Updated diagnosis", 1]
    );
  });
});
