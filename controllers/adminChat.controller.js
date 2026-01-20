import sharp from "sharp";
import AdminChatService from "../services/adminChat.service.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import cloudinary from "../config/cloudinary.js";

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
    const conversation = await AdminChatService.closeConversation(conversationId);
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    console.log("File received:", {
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });

    let result;
    let type;
    let finalUrl;
    let previewUrl;

    if (req.file.mimetype.startsWith("image/")) {
      // Compress images
      const compressedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      result = await uploadBufferToCloudinary(
        compressedBuffer, 
        "chat-files",
        "image"
      );
      type = "image";
      finalUrl = result.secure_url;
      
    } else if (req.file.mimetype === "application/pdf") {
      // Upload PDF as RAW for download
      const timestamp = Date.now();
      const filename = req.file.originalname.replace(/\.[^/.]+$/, "");
      
      result = await uploadBufferToCloudinary(
        req.file.buffer, 
        "chat-files",
        "raw",
        { 
          public_id: `${timestamp}_${filename}`,
          resource_type: "raw"
        }
      );
      
      // Also upload as image type for preview (first page)
      const previewResult = await uploadBufferToCloudinary(
        req.file.buffer, 
        "chat-files",
        "image",
        { 
          public_id: `${timestamp}_${filename}_preview`
        }
      );
      
      // Generate PNG preview of first page
      previewUrl = cloudinary.url(previewResult.public_id, {
        resource_type: 'image',
        format: 'png',
        page: 1,
        secure: true
      });
      
      console.log("Cloudinary result:", result);
      console.log("Preview URL:", previewUrl);
      
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
      imageUrl: previewUrl || finalUrl,  // PNG preview for PDFs, same as imageUrl for images
      type,
      publicId: result.public_id,
    });

  } catch (error) {
    console.error("[uploadChatFile] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};