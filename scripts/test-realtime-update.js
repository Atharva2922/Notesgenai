const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
}

const userSchema = new mongoose.Schema({
    credits: Number,
}, { strict: false });

const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', userSchema);

async function run() {
    console.log('Connecting to DB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected. Return 5 seconds before updating...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Updating credits...');
    // Find a user or random one
    const user = await UserProfile.findOne();
    if (!user) {
        console.error('No users found');
        process.exit(1);
    }

    const oldCredits = user.credits || 0;
    const newCredits = oldCredits + 100;

    await UserProfile.updateOne({ _id: user._id }, { $set: { credits: newCredits } });

    console.log(`Updated user ${user._id} credits from ${oldCredits} to ${newCredits}`);
    await mongoose.disconnect();
}

run().catch(console.error);
