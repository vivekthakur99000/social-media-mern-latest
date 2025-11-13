import fs from "fs";
import imagekit from "../configs/imageKit";
import path from "path";
import Post from "../models/Post.js";

//  Add post

export const addPost = async (req, res) => {
  try {
    const userId = req.auth();
    const { content, post_type } = req.body;
    const images = req.files;

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
      image_urls = await Promise.all(
        images.map(async (image) => {
          const response = await uploadFileToImageKit(image);
          if (!response) return null;

          // generate optimized url using filePath (response.filePath should exist)
          const url = imagekit.url({
            path: response.filePath,
            transformation: [
              { quality: "auto" },
              { format: "webp" },
              { width: "1280" },
            ],
          });

          return url;
        })
      );
    }

    await Post.create({
      user : userId,
      content,
      image_urls,
      post_type
    })

    res.json({success : true, message : "Post created successfully"})
  } catch (error) {
    console.log(error);
    res.json({success : false, message : error.message})
    
  }
};
