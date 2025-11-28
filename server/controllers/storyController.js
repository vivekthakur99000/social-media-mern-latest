import fs from 'fs';
import Story from '../models/Story.js';
import User from '../models/User.js';
import { toFile } from '@imagekit/nodejs';
import imagekit from '../configs/imageKit.js';
import { inngest } from "../inngest/index.js";

export const addUserStory = async (req, res) => {
    try {
        const { userId } = await req.auth();

        const { content, media_type, background_color } = req.body;
        const media = req.file;

        let media_url = "";

        // upload media to imagekit 
        if (media_type === 'image' || media_type === 'video') {
            if (!media) {
                return res.json({ success: false, message: "Media file is required" });
            }

            let response;

            // disk storage (multer.diskStorage)
            if (media.path) {
                const stream = fs.createReadStream(media.path);
                response = await imagekit.files.upload({
                    file: stream,
                    fileName: media.originalname || `story-${Date.now()}`,
                    folder: "stories",
                });
                // cleanup temp file
                try { fs.unlinkSync(media.path); } catch (e) {}
            }
            // memory storage (multer.memoryStorage)
            else if (media.buffer) {
                const fileObj = await toFile(media.buffer, media.originalname || `story-${Date.now()}`);
                response = await imagekit.files.upload({
                    file: fileObj,
                    fileName: media.originalname || `story-${Date.now()}`,
                    folder: "stories",
                });
            }

            media_url = response?.url || response?.filePath;
        }

        // create new story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color,
        });

        // schedule inngest function to delete story after 24 hours
        await inngest.send({
            name: "app/story.delete",
            data: { storyId: story._id },
        });

        res.json({ success: true, message: "Story added successfully", story });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// get all stories
export const getAllStories = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // User connections and followings
        const userIds = [
            userId,
            ...(Array.isArray(user.connections) ? user.connections : []),
            ...(Array.isArray(user.following) ? user.following : []),
        ];

        const stories = await Story.find({ user: { $in: userIds } })
            .sort({ createdAt: -1 })
            .populate('user');

        res.json({ success: true, stories });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};