const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Meal = require('../models/Meal');

// @route   POST api/meals
// @desc    Add a new meal
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Meal name is required').not().isEmpty(),
      check('calories', 'Calories is required').isNumeric(),
      check('mealType', 'Meal type is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, calories, protein, carbs, fats, mealType } = req.body;

    try {
      const newMeal = new Meal({
        user: req.user.id,
        name,
        calories,
        protein: protein || 0,
        carbs: carbs || 0,
        fats: fats || 0,
        mealType
      });

      const meal = await newMeal.save();
      res.json(meal);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/meals
// @desc    Get all meals for logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const meals = await Meal.find({ user: req.user.id }).sort({ date: -1 });
    res.json(meals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/meals/:id
// @desc    Get meal by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);

    if (!meal) {
      return res.status(404).json({ msg: 'Meal not found' });
    }

    // Make sure user owns the meal
    if (meal.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    res.json(meal);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Meal not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/meals/:id
// @desc    Delete meal
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);

    if (!meal) {
      return res.status(404).json({ msg: 'Meal not found' });
    }

    // Make sure user owns the meal
    if (meal.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await meal.remove();
    res.json({ msg: 'Meal removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Meal not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/meals/summary/today
// @desc    Get today's meal summary
// @access  Private
router.get('/summary/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const meals = await Meal.find({
      user: req.user.id,
      date: { $gte: today }
    });

    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      mealsByType: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: []
      }
    };

    meals.forEach(meal => {
      summary.totalCalories += meal.calories;
      summary.totalProtein += meal.protein;
      summary.totalCarbs += meal.carbs;
      summary.totalFats += meal.fats;
      summary.mealsByType[meal.mealType].push(meal);
    });

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;