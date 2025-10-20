// get user data using userId

import User from "../models/User"

export const getUserData = async (req, res) => {
    try {

        const {userId} = req.auth()

        const user = await User.findById(userId)

        if (!user) {
            return res.json({success : false, message : "User not found"})
        }

        res.json({success : true, user})
        
    } catch (error) {
        console.log(error);
        res.json({success : false, message : error.message})
        
    }
}

// udate user data

export const updateUserData = async (req, res) => {
    try {

        const {userId} = req.auth()
        const {username, bio, location, full_name} = req.body

        const tempUser = await User.findById(userId)

        !username  && (username = tempUser.username)

        if (tempUser.username !== username) {
            const user = await User.findOne({username})
            if (user) {
                // we will not change the username if it is already taken 
                username = tempUser.username
            }
        }

        const updatedData = {
            username,
            bio,
            location,
            full_name
        }
        
        
    } catch (error) {
        console.log(error);
        res.json({success : false, message : error.message})
        
    }
}