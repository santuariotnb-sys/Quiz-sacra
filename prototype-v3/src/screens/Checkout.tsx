import { motion } from "framer-motion";

export function Checkout() {
  return (
    <motion.div
      style={{ textAlign: "center", paddingTop: 60 }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
    >
      <h2>✅ Protótipo <em>completo</em></h2>
      <p className="text-suave" style={{ marginTop: 10, lineHeight: 1.6 }}>
        Em produção, este botão abre o CheckoutModal real (Pagar.me) já existente no Quiz-sacra.
      </p>
    </motion.div>
  );
}
