import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export const syncVendorsWithRecipe = async (recipeId, recipeData, type) => {
  const vendorsRef = collection(db, 'vendors');
  const vendorsSnapshot = await getDocs(vendorsRef);

  const batch = writeBatch(db);

  vendorsSnapshot.docs.forEach(vendorDoc => {
    const vendorData = vendorDoc.data();
    const vendorMenu = vendorData.menu || [];

    let updatedMenu = [];

    if (type === 'delete') {
      // Filter out the deleted recipe from the vendor's menu
      updatedMenu = vendorMenu.filter(menuItem => menuItem.name !== recipeData.name);
    } else { // type === 'update' or 'add'
      let recipeFound = false;
      updatedMenu = vendorMenu.map(menuItem => {
        if (menuItem.name === recipeData.name) { // Assuming recipe name is unique and used as identifier
          recipeFound = true;
          // Merge recipe data, preserving vendor-specific fields like 'stock'
          return {
            ...menuItem, // Preserve existing vendor-specific fields
            name: recipeData.name,
            mrp: recipeData.mrp,
            sellingPrice: recipeData.sellingPrice,
            description: recipeData.description,
            // Do NOT update stock or date here, as they are vendor-specific
          };
        }
        return menuItem;
      });

      // If recipe was not found in vendor's menu, it's a new recipe, so add it
      if (!recipeFound) {
        updatedMenu.push({
          name: recipeData.name,
          mrp: recipeData.mrp,
          sellingPrice: recipeData.sellingPrice,
          description: recipeData.description,
          stock: 0, // Initialize stock for new item
          date: new Date(), // Set current date for new item
        });
      }
    }

    batch.update(vendorDoc.ref, { menu: updatedMenu });
  });

  try {
    await batch.commit();
    console.log('Vendors synced with recipe successfully!');
  } catch (error) {
    console.error('Error syncing vendors with recipe:', error);
    throw error;
  }
};