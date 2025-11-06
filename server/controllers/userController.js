// get user data using userId

import fs from "fs";
import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import { toFile } from "@imagekit/nodejs"; // added
import Connection from "../models/Connection.js";

export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// update user data

export const updateUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    let { username, bio, location, full_name } = req.body;

    const tempUser = await User.findById(userId);
    !username && (username = tempUser.username);

    if (tempUser.username !== username) {
      const user = await User.findOne({ username });
      if (user) {
        // we will not change the username if it is already taken
        username = tempUser.username;
      }
    }

    const updatedData = { username, bio, location, full_name };

    const profile = req.files?.profile?.[0];
    const cover = req.files?.cover?.[0];

    const uploadFileToImageKit = async (file, folder = "/uploads") => {
      if (!file) return null;

      // disk storage (multer.diskStorage)
      if (file.path) {
        const stream = fs.createReadStream(file.path);
        const resp = await imagekit.files.upload({
          file: stream,
          fileName: file.originalname,
          folder,
        });
        // cleanup temp file
        try {
          fs.unlinkSync(file.path);
        } catch (e) {}
        return resp;
      }

      // memory storage (multer.memoryStorage)
      if (file.buffer) {
        const fileObj = await toFile(file.buffer, file.originalname);
        const resp = await imagekit.files.upload({
          file: fileObj,
          fileName: file.originalname,
          folder,
        });
        return resp;
      }

      return null;
    };

    if (profile) {
      const response = await uploadFileToImageKit(profile, "/profiles");
      if (response?.url) {
        updatedData.profile_picture = response.url;
      }
    }

    if (cover) {
      const response = await uploadFileToImageKit(cover, "/covers");
      if (response?.url) {
        updatedData.cover_photo = response.url;
      }
    }

    const user = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    res.json({ success: true, user, message: "profile updated successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// find user using username email, location, name

export const discoverUsers = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { input } = req.body;

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, "i") },
        { email: new RegExp(input, "i") },
        { full_name: new RegExp(input, "i") },
        { location: new RegExp(input, "i") },
      ],
    });

    const filterUsers = allUsers.filter((user) => user._id !== userId);

    res.json({ success: true, users: filterUsers });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Follow user

export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { id } = req.body;

    const user = await User.findById(userId);

    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: "You are already following this user",
      });
    }

    user.following.push(id);

    await user.save();

    const toUser = await User.findById(id);

    toUser.followers.push(userId);

    await toUser.save();

    res.json({ success: true, message: "You are following this user" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// unfollow user

// Follow user

export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { id } = req.body;

    const user = await User.findById(userId);

    user.following = user.following.filter((user) => user !== id);

    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers.filter((user) => user !== userId);

    await toUser.save();

    res.json({ success: true, message: "You are no following this user" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// send connection request

export const sendConnctionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    // check if user has sent more than 20 connection requests in last 24 hours

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const connectionRequests = await Connection.find({
      from_user_id: userId,
      createdAt: { $gt: last24Hours },
    });

    if (connectionRequests >= 20) {
      return res.json({success : false, message : "You have send more than 20 request in last 24 hours"})
    }

    // check if users are already connected

    const connection = await Connection.findOne(
      {
        $or : [
          {from_user_id : userId, to_user_id : id},
          {from_user_id : userId, to_user_id : userId}
        ]
      }
    )

  } catch (error) {}
};
