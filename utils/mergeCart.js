import User from "../models/user.module.js";
export const mergeGuestCartIntoUserCart = async (userId, guestCart) => {
    const user = await User.findById(userId);
    console.log(guestCart)

    const existingCart = user.cartData || {};

    guestCart.forEach(item => {
        const id = item._id;
        const guestQuantity = item.quantity || 0;
        const guestSize = item.size || null;

        if (existingCart[id]) {
            // Item exists - add quantities
            existingCart[id].quantity += guestQuantity;
        } else {
            // New item - add with size
            existingCart[id] = {
                quantity: guestQuantity,
                size: guestSize
            };
        }
    });

    user.cartData = existingCart;
    user.markModified("cartData");
    await user.save();

    return user;
};
