const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
  listarUpdates,
  detectarAlteracoes,
  tirarSnapshot,
  criarUpdate,
  obterUpdate,
  deletarUpdate,
} = require('../controllers/updatePublishController');

// All routes require super_admin
router.use(auth, authorize('super_admin'));

router.get('/', listarUpdates);
router.post('/detect-changes', detectarAlteracoes);
router.post('/snapshot', tirarSnapshot);
router.post('/create', criarUpdate);
router.get('/:id', obterUpdate);
router.delete('/:id', deletarUpdate);

module.exports = router;
