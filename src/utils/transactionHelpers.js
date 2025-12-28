import { v4 as uuidv4 } from 'uuid';

/**
 * Generate unique contract number
 * Format: YYYYMMDD-XXXX (where XXXX is first 4 chars of UUID)
 * Example: 20250127-A3F9
 */
export const generateContractNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const uuid = uuidv4().split('-')[0].toUpperCase().substring(0, 4);

    return `${year}${month}${day}-${uuid}`;
};

/**
 * Calculate financial balances for a transaction
 */
export const calculateBalances = (transaction, advances, deliveries) => {
    const totalAdvances = advances.reduce((sum, adv) => sum + adv.amount, 0);
    const totalDelivered = deliveries.reduce((sum, del) => sum + del.quantity, 0);

    const moneyBalance = (transaction.totalAmount || 0) - totalAdvances;
    const productBalance = (transaction.quantity || 0) - totalDelivered;

    const moneyProgress = transaction.totalAmount > 0
        ? (totalAdvances / transaction.totalAmount) * 100
        : 0;

    const productProgress = transaction.quantity > 0
        ? (totalDelivered / transaction.quantity) * 100
        : 0;

    return {
        totalAdvances,
        totalDelivered,
        moneyBalance,
        productBalance,
        moneyProgress: Math.round(moneyProgress * 100) / 100,
        productProgress: Math.round(productProgress * 100) / 100,
    };
};
