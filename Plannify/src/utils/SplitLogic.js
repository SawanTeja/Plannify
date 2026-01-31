// Helper to distribute residual amounts (cents) to the first person or random to avoid floating point issues
const distributeResidual = (splits, totalAmount) => {
    let allocated = Object.values(splits).reduce((a, b) => a + b, 0);
    const diff = totalAmount - allocated;
    if (diff !== 0) {
        // give the tiny difference to the first person
        const firstKey = Object.keys(splits)[0];
        if (firstKey) {
            splits[firstKey] += diff;
        }
    }
    return splits;
};

export const splitEqually = (amount, members) => {
    if (!members || members.length === 0) return {};
    const count = members.length;
    let splitAmount = parseFloat((amount / count).toFixed(2));
    
    const splits = {};
    members.forEach(m => splits[m.id] = splitAmount);
    
    return distributeResidual(splits, amount);
};

export const splitByPercentage = (amount, members, percentages) => {
    // percentages: { userId: 50, userId2: 50 }
    const splits = {};
    members.forEach(m => {
        const pct = percentages[m.id] || 0;
        splits[m.id] = parseFloat(((amount * pct) / 100).toFixed(2));
    });
    return distributeResidual(splits, amount);
};

export const splitByShares = (amount, members, shares) => {
    // shares: { userId: 2, userId2: 1 }
    const totalShares = Object.values(shares).reduce((a, b) => a + Number(b), 0);
    if (totalShares === 0) return splitEqually(amount, members);

    const unitCost = amount / totalShares;
    const splits = {};
    
    members.forEach(m => {
        const share = shares[m.id] || 0;
        splits[m.id] = parseFloat((unitCost * share).toFixed(2));
    });
    
    return distributeResidual(splits, amount);
};

export const splitByAdjustment = (amount, members, adjustments) => {
    // adjustments: { userId: +10, userId2: -10 }
    // Logic: Split equally the (Total - Sum of Adjustments), then add adjustments
    const totalAdjustments = Object.values(adjustments).reduce((a, b) => a + Number(b), 0);
    const baseAmount = amount - totalAdjustments;
    const equalShare = baseAmount / members.length;
    
    const splits = {};
    members.forEach(m => {
        const adj = adjustments[m.id] || 0;
        splits[m.id] = parseFloat((equalShare + adj).toFixed(2));
    });
    
    return distributeResidual(splits, amount);
};

export const splitExact = (amount, members, exactAmounts) => {
     // exactAmounts: { userId: 50, ... }
     // Just return checks if it matches total
     return exactAmounts;
};

export const simplifyDebts = (balances) => {
    // balances: { user1: -10, user2: +10, ... }
    // Returns array of { from: user1, to: user2, amount: 10 }
    
    let debtors = [];
    let creditors = [];
    
    Object.entries(balances).forEach(([uid, amount]) => {
        if (amount < -0.01) debtors.push({ id: uid, amount });
        if (amount > 0.01) creditors.push({ id: uid, amount });
    });
    
    debtors.sort((a,b) => a.amount - b.amount); // Ascending (most negative first)
    creditors.sort((a,b) => b.amount - a.amount); // Descending (most positive first)
    
    const transactions = [];
    let i = 0; // debtor index
    let j = 0; // creditor index
    
    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];
        
        // The amount to settle is the minimum of what debtor owes and creditor is owed
        let amount = Math.min(Math.abs(debtor.amount), creditor.amount);
        
        transactions.push({
            from: debtor.id,
            to: creditor.id,
            amount: parseFloat(amount.toFixed(2))
        });
        
        debtor.amount += amount;
        creditor.amount -= amount;
        
        // If fully settled, move to next
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }
    
    return transactions;
};
