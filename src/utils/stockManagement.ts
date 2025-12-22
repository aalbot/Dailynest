import firebase from "firebase/compat/app";
import "firebase/compat/database";

export const adjustStockForOrder = async (order: any, direction: 'reduce' | 'increase') => {
    const db = firebase.database();
    const items: string[] = Object.keys(order)
        .filter(k => k.startsWith('item') && order[k])
        .map(k => order[k]);

    if (items.length === 0) return;

    // Fetch all products and stock for matching
    const productsSnap = await db.ref("root/products").once("value");
    const stockSnap = await db.ref("root/stock").once("value");

    const products = productsSnap.val() || {};
    const stocks = stockSnap.val() || {};

    for (const itemStr of items) {
        // Parse "Product Name x 2" or similar
        let name = itemStr;
        let diff = 1;

        // Try to match "Name x 2" or "Name (2)" or similar
        const qtyMatch = itemStr.match(/(.+) x (\d+)$/) || itemStr.match(/(.+) \((\d+)\)$/);
        if (qtyMatch) {
            name = qtyMatch[1].trim();
            diff = parseInt(qtyMatch[2]);
        }

        // Find product ID by name
        // We match by name. This is fallback logic if IDs aren't present.
        const prodId = Object.keys(products).find(id => products[id].name === name);

        if (prodId) {
            // Find variant. If the item string has something in parens like (01), use it.
            // Otherwise, default to the first variant found or "01"
            let variantId = "01";
            const varMatch = itemStr.match(/\[(.+)\]/) || itemStr.match(/\((01|02|03|04|05)\)/); // Common variant patterns
            if (varMatch) {
                variantId = varMatch[1];
            } else if (stocks[prodId]) {
                variantId = Object.keys(stocks[prodId])[0] || "01";
            }

            const variantRef = db.ref(`root/stock/${prodId}/${variantId}`);
            const variantData = stocks[prodId]?.[variantId];

            if (variantData) {
                const currentQty = parseInt(variantData.quantity) || 0;
                const newQty = direction === 'reduce' ? currentQty - diff : currentQty + diff;

                await variantRef.update({ quantity: Math.max(0, newQty) });

                // Also update the master stock in products node if it exists (for consistency)
                const prodRef = db.ref(`root/products/${prodId}`);
                const prodSnap = await prodRef.once("value");
                if (prodSnap.exists() && prodSnap.val().stock !== undefined) {
                    const currentMasterStock = parseInt(prodSnap.val().stock) || 0;
                    const newMasterStock = direction === 'reduce' ? currentMasterStock - diff : currentMasterStock + diff;
                    await prodRef.update({ stock: Math.max(0, newMasterStock) });
                }
            }
        }
    }
};
