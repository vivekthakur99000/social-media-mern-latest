export const protect = async (req, res, next) => {
    try {
        const {userId} = await req.auth()
        if (!userId) {
            return res.json({success : false, message : "Not authenticated"})
        }

        next()

    } catch (error) {
        console.log(error.message);
        res.json({success : false, message : error.message})
    }
}