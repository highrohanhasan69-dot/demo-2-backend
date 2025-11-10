// models/Cart.js
const { DataTypes } = require('sequelize');
const sequelize = require('../dbc'); // adjust path if needed

const Cart = sequelize.define('Cart', {
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  items: {
    type: DataTypes.JSON, // Store cart items as JSON array
    defaultValue: [],
  },
});

module.exports = Cart;
