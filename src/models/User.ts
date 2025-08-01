import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: String,
  // Context tracking for suggestions and chat
  lastContextHash: String, // Hash of last 3 posts context
  lastContextUpdatedAt: Date, // When context was last updated
  cachedSuggestions: {
    activities: [String],
    movies: [String],
    songs: [String],
    food: [String]
  }, // Cached AI-generated suggestions
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', userSchema); 