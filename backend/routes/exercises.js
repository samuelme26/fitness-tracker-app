const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Exercise = require('../models/Exercise');

// @route   POST api/exercises
// @desc    Add a new exercise
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Exercise name is required').not().isEmpty(),
      check('duration', 'Duration is required').isNumeric(),
      check('caloriesBurned', 'Calories burned is required').isNumeric(),
      check('exerciseType', 'Exercise type is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, duration, caloriesBurned, exerciseType } = req.body;

    try {
      const newExercise = new Exercise({
        user: req.user.id,
        name,
        duration,
        caloriesBurned,
        exerciseType
      });

      const exercise = await newExercise.save();
      res.json(exercise);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/exercises
// @desc    Get all exercises for logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const exercises = await Exercise.find({ user: req.user.id }).sort({ date: -1 });
    res.json(exercises);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/exercises/:id
// @desc    Get exercise by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ msg: 'Exercise not found' });
    }

    // Make sure user owns the exercise
    if (exercise.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    res.json(exercise);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Exercise not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/exercises/:id
// @desc    Delete exercise
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ msg: 'Exercise not found' });
    }

    // Make sure user owns the exercise
    if (exercise.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await exercise.remove();
    res.json({ msg: 'Exercise removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Exercise not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/exercises/summary/today
// @desc    Get today's exercise summary
// @access  Private
router.get('/summary/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exercises = await Exercise.find({
      user: req.user.id,
      date: { $gte: today }
    });

    const summary = {
      totalDuration: 0,
      totalCaloriesBurned: 0,
      exercisesByType: {
        cardio: [],
        strength: [],
        flexibility: [],
        balance: []
      }
    };

    exercises.forEach(exercise => {
      summary.totalDuration += exercise.duration;
      summary.totalCaloriesBurned += exercise.caloriesBurned;
      summary.exercisesByType[exercise.exerciseType].push(exercise);
    });

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;