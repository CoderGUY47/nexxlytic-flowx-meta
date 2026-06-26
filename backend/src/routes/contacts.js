// contacts.js
const express = require('express');
const { flexAuth } = require('../middleware/auth');
const { getContacts, getContact, createContact, updateContact, deleteContact, addTag } = require('../controllers/contactController');
const router = express.Router();
router.use(flexAuth);
router.get('/', getContacts);
router.get('/:id', getContact);
router.post('/', createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
router.post('/:id/tags', addTag);
module.exports = router;
