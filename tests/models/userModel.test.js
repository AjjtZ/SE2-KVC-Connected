const db = require("../../server/config/db");
const UserModel = require("../../server/models/userModel");

jest.mock("../../server/config/db", () => {
  return {
    query: jest.fn(),
    execute: jest.fn(),
  };
});

describe("UserModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get a user by ID", async () => {
    const mockUser = { user_id: 1, user_email: "test@example.com" };
    db.execute.mockResolvedValue([[mockUser]]);

    const user = await UserModel.getUserById(1);
    expect(user).toEqual(mockUser);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE user_id = ?",
      [1]
    );
  });

  it("should return null if user not found by ID", async () => {
    db.execute.mockResolvedValue([[]]);

    const user = await UserModel.getUserById(1);
    expect(user).toBeNull();
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE user_id = ?",
      [1]
    );
  });

  it("should get owner by user ID", async () => {
    const mockOwner = { user_id: 1, owner_address: "123 Main St" };
    db.execute.mockResolvedValue([[mockOwner]]);

    const owner = await UserModel.getOwnerByUserId(1);
    expect(owner).toEqual(mockOwner);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM owner WHERE user_id = ?",
      [1]
    );
  });

  it("should return null if owner not found by user ID", async () => {
    db.execute.mockResolvedValue([[]]);

    const owner = await UserModel.getOwnerByUserId(1);
    expect(owner).toBeNull();
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT * FROM owner WHERE user_id = ?",
      [1]
    );
  });

  it("should get password by user ID", async () => {
    const mockPassword = "hashedpassword";
    db.execute.mockResolvedValue([[{ user_password: mockPassword }]]);

    const password = await UserModel.getPasswordById(1);
    expect(password).toEqual(mockPassword);
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT user_password FROM users WHERE user_id = ?",
      [1]
    );
  });

  it("should return null if password not found by user ID", async () => {
    db.execute.mockResolvedValue([[]]);

    const password = await UserModel.getPasswordById(1);
    expect(password).toBeNull();
    expect(db.execute).toHaveBeenCalledWith(
      "SELECT user_password FROM users WHERE user_id = ?",
      [1]
    );
  });

  it("should update password", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await UserModel.updatePassword(1, "newhashedpassword");
    expect(result).toEqual([{ affectedRows: 1 }]);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE users SET user_password = ? WHERE user_id = ?",
      ["newhashedpassword", 1]
    );
  });

  it("should find user by email", async () => {
    const mockUser = {
      user_id: 1,
      user_password: "hashedpassword",
      user_role: "user",
    };
    db.query.mockResolvedValue([[mockUser]]);

    const user = await UserModel.findByEmail("test@example.com");
    expect(user).toEqual(mockUser);
    expect(db.query).toHaveBeenCalledWith(
      "SELECT user_id, user_password, user_role FROM users WHERE user_email = ?",
      ["test@example.com"]
    );
  });

  it("should return null if user not found by email", async () => {
    db.query.mockResolvedValue([[]]);

    const user = await UserModel.findByEmail("test@example.com");
    expect(user).toBeNull();
    expect(db.query).toHaveBeenCalledWith(
      "SELECT user_id, user_password, user_role FROM users WHERE user_email = ?",
      ["test@example.com"]
    );
  });

  it("should check if email is taken", async () => {
    db.query.mockResolvedValue([[{ user_id: 1 }]]);

    const isTaken = await UserModel.isEmailTaken("test@example.com");
    expect(isTaken).toBe(true);
    expect(db.query).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE user_email = ?",
      ["test@example.com"]
    );
  });

  it("should return false if email is not taken", async () => {
    db.query.mockResolvedValue([[]]);

    const isTaken = await UserModel.isEmailTaken("test@example.com");
    expect(isTaken).toBe(false);
    expect(db.query).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE user_email = ?",
      ["test@example.com"]
    );
  });

  it("should create a pet owner", async () => {
    const mockUserData = {
      fname: "John",
      lname: "Doe",
      email: "john.doe@example.com",
      contact: "1234567890",
      address: "123 Main St",
      password: "hashedpassword",
      altPerson1: "Jane Doe",
      altContact1: "0987654321",
    };
    db.query.mockResolvedValue([{ insertId: 1 }]);

    const userId = await UserModel.createPetOwner(mockUserData);
    expect(userId).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO users (user_email, user_password, user_firstname, user_lastname, user_contact, user_role) VALUES (?, ?, ?, ?, ?, ?)",
      [
        "john.doe@example.com",
        "hashedpassword",
        "John",
        "Doe",
        "1234567890",
        "owner",
      ]
    );
    expect(db.execute).toHaveBeenCalledWith(
      "INSERT INTO owner (user_id, owner_address, owner_alt_person1, owner_alt_contact1) VALUES (?, ?, ?, ?)",
      [1, "123 Main St", "Jane Doe", "0987654321"]
    );
  });

  it("should create an employee", async () => {
    const mockEmployeeData = {
      fname: "Jane",
      lname: "Doe",
      email: "jane.doe@example.com",
      role: "Vet",
      hashedPassword: "hashedpassword",
    };
    db.execute.mockResolvedValue([{ insertId: 1 }]);

    const userId = await UserModel.createEmployee(mockEmployeeData);
    expect(userId).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "INSERT INTO users (user_email, user_password, user_firstname, user_lastname, user_role) VALUES (?, ?, ?, ?, ?)",
      ["jane.doe@example.com", "hashedpassword", "Jane", "Doe", "Vet"]
    );
  });

  it("should update employee profile", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await UserModel.updateEmployeeProfile(
      1,
      "Jane",
      "Doe",
      "jane.doe@example.com",
      "1234567890"
    );
    expect(result).toEqual([{ affectedRows: 1 }]);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE users SET user_firstname = ?, user_lastname = ?, user_email = ?, user_contact = ? WHERE user_id = ?",
      ["Jane", "Doe", "jane.doe@example.com", "1234567890", 1]
    );
  });

  it("should update owner profile", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await UserModel.updateOwnerProfile(
      1,
      "John",
      "Doe",
      "john.doe@example.com",
      "1234567890",
      "123 Main St",
      "Jane Doe",
      "0987654321"
    );
    expect(result).toEqual([{ affectedRows: 1 }]);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE users SET user_firstname = ?, user_lastname = ?, user_email = ?, user_contact = ? WHERE user_id = ?",
      ["John", "Doe", "john.doe@example.com", "1234567890", 1]
    );
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE owner SET owner_address = ?, owner_alt_person1 = ?, owner_alt_contact1 = ? WHERE user_id = ?",
      ["123 Main St", "Jane Doe", "0987654321", 1]
    );
  });
});
