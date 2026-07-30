const express = require("express");
const router = express.Router();
const {
  listarVouchers,
  gerarVouchersLote,
  excluirVoucher
} = require("../controllers/voucherController");

router.get("/", listarVouchers);
router.post("/gerar-lote", gerarVouchersLote);
router.delete("/:id", excluirVoucher);

module.exports = router;
