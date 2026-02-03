import sharp from "sharp";
import AdminChatService from "../services/adminChat.service.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import cloudinary from "../config/cloudinary.js";
import { logActivity, logError } from "../utils/logger.js";
import { logQuery } from "../utils/logQuery.js";

export const getAdminConversations = async (req, res) => {
  try {
    const conversations = await AdminChatService.getAllConversationsWithDetails();
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await AdminChatService.getConversationHistory(conversationId);
    await AdminChatService.markAsRead(conversationId, req.auth.userId);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const startConversation = async (req, res) => {
  try {
    const { participantId, participantModel } = req.body;

    if (!participantId || !participantModel) {
      return res.status(400).json({
        success: false,
        message: "participantId and participantModel are required"
      });
    }

    const conversation = await AdminChatService.startConversation(
      req.auth.userId,
      participantId,
      participantModel
    );

    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const closeConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await logQuery(req, `AdminChatService.closeConversation(${conversationId})`, () => AdminChatService.closeConversation(conversationId));

    logActivity({
      email: req.auth.email,
      user: req.auth.userId,
      role: "Admin",
      status: "success",
      target: conversationId,
      action: "CLOSE_CONVERSATION",
      message: `Admin closed conversation: ${conversationId}`,
      metadata: { conversationId, requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({ success: true, conversation });
  } catch (error) {
    logError({
      error,
      context: "Admin Close Conversation",
      metadata: { conversationId: req.params.conversationId, adminId: req.auth.userId, requestId: req.requestId }
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    let result;
    let type;
    let finalUrl;

    if (req.file.mimetype.startsWith("image/")) {
      const compressedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      result = await uploadBufferToCloudinary(compressedBuffer, "chat-files", "image");
      type = "image";
      finalUrl = result.secure_url;

    } else if (req.file.mimetype === "application/pdf") {
      // Upload PDF as RAW for download
      const timestamp = Date.now();
      const filename = req.file.originalname.replace(/\.[^/.]+$/, "");

      result = await uploadBufferToCloudinary(req.file.buffer, "chat-files", "raw",
        {
          public_id: `${timestamp}_${filename}`,
          resource_type: "raw"
        }
      );

      finalUrl = result.secure_url;  // Raw PDF for download
      type = "pdf";

    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type"
      });
    }

    res.json({
      success: true,
      downloadUrl: finalUrl,  // For images and PDF downloads
      imageUrl: type === "image" ? finalUrl : null,
      type,
      publicId: result.public_id,
    });

  } catch (error) {
    console.error("[uploadChatFile] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};