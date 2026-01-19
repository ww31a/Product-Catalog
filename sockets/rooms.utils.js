export const generateRoomId = (userId, sellerId) => {
  return `user-${userId}-seller-${sellerId}`;
};

export const supportRoomId = (conversationId) => {
  return `admin-support-${conversationId}`;
};
