const Cart = require('../models/Cart');
const { pool, sequelize } = require('../db');

// helper: get user id from cookie
const getUserId = (req) => req.cookies.userId || null;

// ---------------- Cart Controllers ----------------
const getCart = async (req, res) => {
  const userId = getUserId(req);
  const cart = await Cart.findAll({ where: { user_id: userId } });
  res.json(cart);
};

const addToCart = async (req, res) => {
  const userId = getUserId(req);
  const { product_id, quantity } = req.body;

  let item = await Cart.findOne({ where: { user_id: userId, product_id } });
  if (item) {
    item.quantity += quantity;
    await item.save();
  } else {
    await Cart.create({ user_id: userId, product_id, quantity });
  }

  const cart = await Cart.findAll({ where: { user_id: userId } });
  res.json(cart);
};

const updateCartItem = async (req, res) => {
  const userId = getUserId(req);
  const { product_id, quantity } = req.body;

  let item = await Cart.findOne({ where: { user_id: userId, product_id } });
  if (item) {
    item.quantity = quantity;
    await item.save();
  }

  const cart = await Cart.findAll({ where: { user_id: userId } });
  res.json(cart);
};

const removeCartItem = async (req, res) => {
  const userId = getUserId(req);
  const { product_id } = req.params;

  await Cart.destroy({ where: { user_id: userId, product_id } });
  const cart = await Cart.findAll({ where: { user_id: userId } });
  res.json(cart);
};

const clearCart = async (req, res) => {
  const userId = getUserId(req);
  await Cart.destroy({ where: { user_id: userId } });
  res.json({ message: "Cart cleared" });
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
