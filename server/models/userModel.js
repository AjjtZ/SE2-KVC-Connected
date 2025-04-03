const db = require("../config/db");

class UserModel {
    static async getUserById(userId) {
        const [rows] = await db.execute("SELECT * FROM users WHERE user_id = ?", [userId]);
        return rows.length ? rows[0] : null;
    }

    static async getOwnerByUserId(userId) {
        const [rows] = await db.execute("SELECT * FROM owner WHERE user_id = ?", [userId]);
        return rows.length ? rows[0] : null;
    }

    static async getPasswordById(userId) {
        const [user] = await db.execute("SELECT user_password FROM users WHERE user_id = ?", [userId]);
        return user.length ? user[0].user_password : null;
    }

    static async updatePassword(userId, hashedPassword) {
        return db.execute("UPDATE users SET user_password = ? WHERE user_id = ?", [hashedPassword, userId]);
    }

    static async findByEmail(email) {
        const sql = "SELECT user_id, user_password, user_role FROM users WHERE user_email = ?";
        const [results] = await db.query(sql, [email]);
        return results.length ? results[0] : null;
    }

    static async isEmailTaken(email) {
        const [results] = await db.query("SELECT * FROM users WHERE user_email = ?", [email]);
        return results.length > 0;
    }

    static async createPetOwner({ fname, lname, email, contact, address, password, altPerson1, altContact1 }, connection) {
        const [result] = await connection.query(
            "INSERT INTO users (user_firstname, user_lastname, user_email, user_contact, user_password, user_role) VALUES (?, ?, ?, ?, ?, ?)",
            [fname, lname, email, contact, password, "owner"]
        );
        const userId = result.insertId;

        await connection.query(
            "INSERT INTO owner (user_id, owner_address, owner_alt_person1, owner_alt_contact1) VALUES (?, ?, ?, ?)",
            [userId, address, altPerson1, altContact1]
        );

        return userId;
    }

    static async createEmployee({ fname, lname, contact, email, role, hashedPassword }) {
        const [result] = await db.execute(
            "INSERT INTO users (user_email, user_contact, user_password, user_firstname, user_lastname, user_role) VALUES (?, ?, ?, ?, ?, ?)",
            [email, contact, hashedPassword, fname, lname, role]
        );
        return result.insertId;
    }

    static async updateEmployeeProfile(userId, firstname, lastname, email, contact) {
        await db.execute(
            "UPDATE users SET user_firstname = ?, user_lastname = ?, user_email = ?, user_contact = ? WHERE user_id = ?",
            [firstname, lastname, email, contact, userId]
        );

        return this.getUserById(userId);
    }

    static async updateOwnerProfile(userId, firstname, lastname, email, contact, address, altperson, altcontact, altperson2, altcontact2) {
        await db.execute(
            "UPDATE users SET user_firstname = ?, user_lastname = ?, user_email = ?, user_contact = ? WHERE user_id = ?",
            [firstname, lastname, email, contact, userId]
        );

        await db.execute(
            "UPDATE owner SET owner_address = ?, owner_alt_person1 = ?, owner_alt_contact1 = ?, owner_alt_person2 = ?, owner_alt_contact2 = ? WHERE user_id = ?",
            [address, altperson, altcontact, altperson2, altcontact2, userId]
        );
    }
}

module.exports = UserModel;