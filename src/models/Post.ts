import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    required: true,
  },
  // AI Analysis Results
  moodDescription: {
    type: String,
    required: true,
  },
  mentalHealthTraits: {
    anxiety: { type: Number, min: 0, max: 10 },
    depression: { type: Number, min: 0, max: 10 },
    stress: { type: Number, min: 0, max: 10 },
    happiness: { type: Number, min: 0, max: 10 },
    energy: { type: Number, min: 0, max: 10 },
    confidence: { type: Number, min: 0, max: 10 },
  },
  overallMood: {
    type: String,
    enum: ['very_happy', 'happy', 'neutral', 'sad', 'very_sad'],
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Post || mongoose.model('Post', postSchema); 