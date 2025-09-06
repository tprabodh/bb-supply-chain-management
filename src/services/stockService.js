
import { db } from '../firebase';
import { collection, getDocs, doc, runTransaction, addDoc, Timestamp } from 'firebase/firestore';

export const getStock = async () => {
  const stockCollection = collection(db, 'stock');
  const stockSnapshot = await getDocs(stockCollection);
  return stockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPreparedStock = async () => {
  const preparedStockCollection = collection(db, 'preparedStock');
  const preparedStockSnapshot = await getDocs(preparedStockCollection);
  return preparedStockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const reportSpoilage = async (spoilageData) => {
  const { itemType, itemId, quantity, stockManagerId } = spoilageData;
  const stockCollectionName = itemType === 'ingredient' ? 'stock' : 'preparedStock';
  const itemRef = doc(db, stockCollectionName, itemId);
  const spoilageLogCollection = collection(db, 'spoilageLog');
  const newSpoilageLogRef = doc(spoilageLogCollection);

  await runTransaction(db, async (transaction) => {
    const itemDoc = await transaction.get(itemRef);
    if (!itemDoc.exists()) {
      throw new Error('Item not found!');
    }

    const currentQuantity = itemDoc.data().quantity;
    if (currentQuantity < quantity) {
      throw new Error('Spoiled quantity cannot be greater than current stock.');
    }

    const newQuantity = currentQuantity - quantity;
    transaction.update(itemRef, { quantity: newQuantity });

    const itemName = itemType === 'ingredient' ? itemId : itemDoc.data().name;

    transaction.set(newSpoilageLogRef, {
      itemId,
      itemName,
      itemType,
      quantity,
      stockManagerId,
      reportedAt: Timestamp.now(),
    });
  });
};
