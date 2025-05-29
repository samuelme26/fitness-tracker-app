const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  caloriesBurned: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  exerciseType: {
    type: String,
    enum: ['cardio', 'strength', 'flexibility', 'balance'],
    required: true
  }
});

module.exports = mongoose.model('Exercise', ExerciseSchema);