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
  detailedMoodDescription: {
    type: String,
    required: true,
  },
  moodDescription: {
    type: String,
    required: true,
  },
  mentalHealthTraits: {
    anxiety: { type: Number, min: 0, max: 10 },
    down: { type: Number, min: 0, max: 10 },
    stress: { type: Number, min: 0, max: 10 },
    joy: { type: Number, min: 0, max: 10 },
    energy: { type: Number, min: 0, max: 10 },
    bold: { type: Number, min: 0, max: 10 },
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