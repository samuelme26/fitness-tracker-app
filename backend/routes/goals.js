const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Goal = require('../models/Goal');

// @route   POST api/goals
// @desc    Add a new goal
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('goalType', 'Goal type is required').not().isEmpty(),
      check('target', 'Target is required').isNumeric(),
      check('endDate', 'End date is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { goalType, target, endDate } = req.body;

    try {
      const newGoal = new Goal({
        user: req.user.id,
        goalType,
        target,
        endDate: new Date(endDate)
      });

      const goal = await newGoal.save();
      res.json(goal);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/goals
// @desc    Get all goals for logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ endDate: 1 });
    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/goals/:id
// @desc    Get goal by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }

    // Make sure user owns the goal
    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    res.json(goal);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/goals/:id
// @desc    Update goal
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }

    // Make sure user owns the goal
    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { current, isCompleted } = req.body;

    if (current !== undefined) goal.current = current;
    if (isCompleted !== undefined) goal.isCompleted = isCompleted;

    await goal.save();
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/goals/:id
// @desc    Delete goal
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }

    // Make sure user owns the goal
    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await goal.remove();
    res.json({ msg: 'Goal removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/goals/progress
// @desc    Get goals progress summary
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id, isCompleted: false });
    
    const progress = goals.map(goal => ({
      id: goal._id,
      goalType: goal.goalType,
      target: goal.target,
      current: goal.current,
      progress: (goal.current / goal.target) * 100,
      daysLeft: Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24)
    }));

    res.json(progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;