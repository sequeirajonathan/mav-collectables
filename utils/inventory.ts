// Helper function to determine max quantity based on stock
export const getMaxQuantity = (stock: number): number => {
  if (stock <= 2) return stock;
  if (stock <= 5) return Math.min(stock, 2);
  if (stock <= 10) return Math.min(stock, 3);
  if (stock <= 20) return Math.min(stock, 5);
  if (stock <= 50) return Math.min(stock, 8);
  return Math.min(stock, 12); // Cap at 12 for very high stock
}; 