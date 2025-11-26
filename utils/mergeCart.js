import User from "../models/user.module.js";
export const mergeGuestCartIntoUserCart = async (userId, guestCart) => {
    const user = await User.findById(userId);

    const existingCart = user.cartData || {};

    guestCart.forEach(item => {
        const id = item._id;
        if (existingCart[id]) {
            existingCart[id] += item.quantity;
        } else {
            existingCart[id] = item.quantity;
        }
    });

    user.cartData = existingCart;
    user.markModified("cartData");
    await user.save();

    return user;
};
