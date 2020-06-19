const express = require('express');
const router = express.Router();

// Any matching route is for the one-page React app:
router.get('*', (req, res, next) => {
    const db = req.app.get('db');
    db.budgets.find({owner: req.user.id}, {columns: ["id", "name"]}).then(allBudgets => {
        res.render('budget.pug', {
            appData: {
                user: res.locals.user,
                // all budgets the user has permission to view:
                allBudgets,
            },
        });
    }, next);
});

module.exports = router;
