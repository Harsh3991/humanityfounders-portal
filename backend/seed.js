/**
 * Seed Script — Creates the initial Admin user
 * Run once: node seed.js
 *
 * The admin is pre-seeded (no onboarding required)
 * Admin can then login and add HR, Managers, Employees
 */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const { ROLES, USER_STATUS } = require("./utils/constants");

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: ROLES.ADMIN });
        if (existingAdmin) {
            console.log("ℹ️  Admin user already exists:");
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.fullName}`);
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            fullName: "System Admin",
            email: "admin@humanityfounders.com",
            password: "Admin@1234",
            role: ROLES.ADMIN,
            department: "Management",
            status: USER_STATUS.ACTIVE, // Admin skips onboarding
        });

        console.log("\n🎉 Admin user created successfully!");
        console.log("───────────────────────────────────");
        console.log(`   Name:     ${admin.fullName}`);
        console.log(`   Email:    ${admin.email}`);
        console.log(`   Password: Admin@1234`);
        console.log(`   Role:     ${admin.role}`);
        console.log(`   Status:   ${admin.status}`);
        console.log("───────────────────────────────────");
        console.log("⚠️  Change the password after first login!\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error.message);
        process.exit(1);
    }
};

seedAdmin();
