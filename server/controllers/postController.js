import fs from "fs";
import imagekit from "../configs/imageKit.js";
import { toFile } from "@imagekit/nodejs";

import Post from "../models/Post.js";
import User from "../models/User.js";

//  Add post

export const addPost = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { content, post_type } = req.body;
    const images = req.files || [];

    let image_urls = [];

    const uploadFileToImageKit = async (file) => {
      if (!file) return null;

      // disk storage (multer.diskStorage)
      if (file.path) {
        const stream = fs.createReadStream(file.path);
        const resp = await imagekit.files.upload({
          file: stream,
          fileName: file.originalname || `post-${Date.now()}`,
          folder: "posts",
        });
        // cleanup temp file
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          /* ignore cleanup errors */
        }
        return resp;
      }

      // memory storage (multer.memoryStorage)
      if (file.buffer) {
        const fileObj = await toFile(
          file.buffer,
          file.originalname || `post-${Date.now()}`
        );
        const resp = await imagekit.files.upload({
          file: fileObj,
          fileName: file.originalname || `post-${Date.now()}`,
          folder: "posts",
        });
        return resp;
      }

      return null;
    };

    if (images.length) {
      const uploaded = await Promise.all(
        images.map(async (image) => {
          const response = await uploadFileToImageKit(image);
          if (!response) return null;

          // prefer response.url returned by ImageKit
          const url =
            response.url ||
            (response.filePath
              ? `${(process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/$/, "")}${response.filePath}`
              : null);

          return url;
        })
      );

      image_urls = uploaded.filter(Boolean);
    }

    await Post.create({
      user: userId,
      content,
      image_urls,
      post_type,
    });

    res.json({ success: true, message: "Post created successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // user connection and follwings
    const userIds = [userId, ...user.connections, ...user.following];
    const posts = await Post.find({ user: { $in: userIds } })
      .populate("user")
      .sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// like post
export const likePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const { userId } = await req.auth();

    const post = await Post.findById(postId);
    if (post.likes_count.includes(userId)) {
      // already liked, so unlike
      post.likes_count = post.likes_count.filter((user) => user !== userId);
      await post.save();
      res.json({ success: true, message: "Post unliked successfully" });
    } else {
      // not liked yet, so like
      post.likes_count.push(userId);
      await post.save();
      res.json({ success: true, message: "Post liked successfully" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
