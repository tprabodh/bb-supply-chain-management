import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, runTransaction } from 'firebase/firestore';

export const subscribeToPendingBulkBuyOrders = (callback, onError) => {
  const q = query(collection(db, 'bulkBuyOrders'), where('status', '==', 'Pending Finance Approval'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  }, onError);

  return unsubscribe;
};

export const subscribeToApprovedBulkBuyOrders = (callback, onError) => {
  const q = query(collection(db, 'bulkBuyOrders'), where('status', '==', 'Approved'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  }, onError);

  return unsubscribe;
};

export const subscribeToPurchasedBulkBuyOrders = (callback, onError) => {
  const q = query(collection(db, 'bulkBuyOrders'), where('status', '==', 'Purchased'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  }, onError);

  return unsubscribe;
};

export const updateBulkBuyOrderStatus = async (orderId, newStatus, modifiedIngredients, totalOrderCost) => {
  const orderRef = doc(db, 'bulkBuyOrders', orderId);
  const updateData = {
    status: newStatus,
  };

  if (newStatus === 'Approved') {
    updateData.approvedAt = new Date();
  }

  if (modifiedIngredients) {
    updateData.ingredients = modifiedIngredients;
    updateData.totalOrderCost = totalOrderCost;
  }

  await updateDoc(orderRef, updateData);
};

export const markBulkBuyOrderAsPurchased = async (orderId) => {
  const orderRef = doc(db, 'bulkBuyOrders', orderId);
  await updateDoc(orderRef, {
    status: 'Purchased',
    purchasedAt: new Date(),
  });
};

export const confirmBulkBuyOrderReceipt = async (order) => {
  const aggregatedIngredients = order.ingredients.reduce((acc, ingredient) => {
    if (acc[ingredient.name]) {
      acc[ingredient.name].quantity += ingredient.quantity;
    } else {
      acc[ingredient.name] = { ...ingredient };
    }
    return acc;
  }, {});

  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'bulkBuyOrders', order.id);

    const ingredientNames = Object.keys(aggregatedIngredients);

    // 1. Read all stock documents first
    const stockDocs = await Promise.all(
      ingredientNames.map(name => {
        const stockRef = doc(db, 'stock', name);
        return transaction.get(stockRef);
      })
    );

    // 2. Perform all writes
    ingredientNames.forEach((name, index) => {
      const stockDoc = stockDocs[index];
      const stockRef = doc(db, 'stock', name);
      const ingredient = aggregatedIngredients[name];

      if (stockDoc.exists()) {
        const newQuantity = (stockDoc.data().quantity || 0) + ingredient.quantity;
        transaction.update(stockRef, { quantity: newQuantity });
      } else {
        transaction.set(stockRef, {
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        });
      }
    });

    transaction.update(orderRef, {
      status: 'Completed',
      completedAt: new Date(),
    });
  });
};
